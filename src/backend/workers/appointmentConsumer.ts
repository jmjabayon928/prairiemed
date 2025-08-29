// src/backend/workers/appointmentConsumer.ts
import 'dotenv/config';
import { Kafka, logLevel } from 'kafkajs';
import { pool } from '../database/pool';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import nodemailer, { type Transporter } from 'nodemailer';
import twilio from 'twilio';

// ----------------------------- Types & Helpers ------------------------------

type AppointmentRow = {
  appointment_id: string;
  patient_id: string;
  date: string;           // ISO
  reason: string | null;
  status: string | null;
};

type PatientRow = {
  patient_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  preferred_language: string | null;
};

type AppointmentCreatedEvent = {
  id: string;          // appointment_id
  patientId: string;
  ts?: number;
};

function isAppointmentCreatedEvent(x: unknown): x is AppointmentCreatedEvent {
  if (!x || typeof x !== 'object') return false;
  const obj = x as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.patientId === 'string';
}

async function ensureAuditTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      actor_id TEXT,
      meta JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function writeAuditLog(input: {
  action: string;
  entity: string;
  entityId: string;
  actorId?: string | null;
  meta?: unknown;
}): Promise<void> {
  const { action, entity, entityId, actorId = null, meta = null } = input;
  await pool.query(
    `INSERT INTO audit_logs (action, entity, entity_id, actor_id, meta)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, entity, entityId, actorId, JSON.stringify(meta)]
  );
}

function exportsDir(): string {
  return path.resolve(process.cwd(), 'exports');
}

async function ensureExportsDir(): Promise<void> {
  await fs.mkdir(exportsDir(), { recursive: true });
}

function formatDate(dt: string): string {
  const d = new Date(dt);
  return isNaN(d.getTime()) ? dt : d.toLocaleString();
}

// ----------------------------- PDF Generation ------------------------------

async function generateAppointmentPdf(opts: {
  appt: AppointmentRow;
  patient: PatientRow | null;
}): Promise<string> {
  await ensureExportsDir();

  const fileName = `appointment-${opts.appt.appointment_id}.pdf`;
  const filePath = path.join(exportsDir(), fileName);

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 48, left: 48, right: 48, bottom: 48 } });
    const ws = createWriteStream(filePath);
    doc.pipe(ws);

    // Header
    doc.fontSize(18).text('PrairieMed — Appointment Receipt', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(1);

    // Patient block
    const p = opts.patient;
    doc.fontSize(14).text('Patient', { underline: true });
    doc.fontSize(12).text(`Name: ${p ? `${p.first_name} ${p.last_name}` : 'Unknown'}`);
    doc.text(`Email: ${p?.email ?? '—'}`);
    doc.text(`Phone: ${p?.phone ?? '—'}`);
    doc.moveDown(1);

    // Appointment block
    const a = opts.appt;
    doc.fontSize(14).text('Appointment', { underline: true });
    doc.fontSize(12).text(`ID: ${a.appointment_id}`);
    doc.text(`Date: ${formatDate(a.date)}`);
    doc.text(`Reason: ${a.reason ?? '—'}`);
    doc.text(`Status: ${a.status ?? 'scheduled'}`);
    doc.moveDown(2);

    doc.text('Thank you for using PrairieMed.', { align: 'left' });
    doc.end();

    ws.on('finish', resolve);
    ws.on('error', reject);
  });

  return filePath;
}

// ----------------------------- Email (SMTP) --------------------------------

function makeTransport(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.log('[Email] SMTP not configured (set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). Skipping email.');
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function sendEmailWithPdf(opts: {
  to: string;
  subject: string;
  text: string;
  pdfPath: string;
}): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'no-reply@prairiemed.local';
  const transporter = makeTransport();
  if (!transporter) return;

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: [{ filename: path.basename(opts.pdfPath), path: opts.pdfPath }],
  });
  console.log('[Email] Sent to', opts.to);
}

// -------------------------------- SMS (Twilio) ------------------------------

function twilioClientOrNull() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.log('[SMS] Twilio not configured (set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN). Skipping SMS.');
    return null;
  }
  return twilio(sid, token);
}

async function sendSms(opts: { to: string; body: string }): Promise<void> {
  const client = twilioClientOrNull();
  const from = process.env.TWILIO_FROM;
  if (!client || !from) return;

  await client.messages.create({ from, to: opts.to, body: opts.body });
  console.log('[SMS] Sent to', opts.to);
}

// ----------------------------- Data Access ---------------------------------

async function fetchAppointment(id: string): Promise<AppointmentRow | null> {
  const { rows } = await pool.query<AppointmentRow>(
    `SELECT appointment_id, patient_id, date, reason, status
     FROM appointments
     WHERE appointment_id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function fetchPatient(id: string): Promise<PatientRow | null> {
  const { rows } = await pool.query<PatientRow>(
    `SELECT patient_id, first_name, last_name, email, phone, preferred_language
     FROM patients
     WHERE patient_id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

// ----------------------------- Main Consumer --------------------------------

(async () => {
  await ensureAuditTable();
  await ensureExportsDir();

  const brokers = [process.env.KAFKA_BROKER ?? 'localhost:9092'];
  const kafka = new Kafka({ clientId: 'prairiemed-worker', brokers, logLevel: logLevel.ERROR });
  const consumer = kafka.consumer({ groupId: 'prairiemed-appointments' });

  await consumer.connect();
  await consumer.subscribe({ topic: 'appointment.created', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() ?? '{}';
      console.log('[appointment.created]', raw);

      let evt: AppointmentCreatedEvent | null = null;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (isAppointmentCreatedEvent(parsed)) {
          evt = parsed;
        }
      } catch {
        // ignore parse errors
      }
      if (!evt) {
        console.warn('[worker] Invalid event payload; skipping');
        return;
      }

      const appt = await fetchAppointment(evt.id);
      if (!appt) {
        console.warn('[worker] Appointment not found; id=', evt.id);
        return;
      }
      const patient = await fetchPatient(appt.patient_id);

      const pdfPath = await generateAppointmentPdf({ appt, patient });

      if (patient?.email) {
        const subject = 'Your PrairieMed Appointment';
        const text = [
          `Hello ${patient.first_name} ${patient.last_name},`,
          '',
          'Your appointment has been created.',
          `Date: ${formatDate(appt.date)}`,
          `Reason: ${appt.reason ?? '—'}`,
          `Status: ${appt.status ?? 'scheduled'}`,
          '',
          'A PDF receipt is attached.',
          '',
          '— PrairieMed',
        ].join('\n');

        try {
          await sendEmailWithPdf({ to: patient.email, subject, text, pdfPath });
        } catch (e) {
          console.warn('[Email] Failed:', (e as Error)?.message ?? e);
        }
      }

      if (patient?.phone) {
        try {
          const body = `PrairieMed: Appointment created for ${formatDate(appt.date)}.`;
          await sendSms({ to: patient.phone, body });
        } catch (e) {
          console.warn('[SMS] Failed:', (e as Error)?.message ?? e);
        }
      }

      try {
        await writeAuditLog({
          action: 'appointment.created',
          entity: 'appointments',
          entityId: appt.appointment_id,
          actorId: null,
          meta: {
            patientId: appt.patient_id,
            date: appt.date,
            status: appt.status ?? 'scheduled',
            pdfPath,
          },
        });
      } catch (e) {
        console.warn('[Audit] Failed:', (e as Error)?.message ?? e);
      }
    },
  });

  console.log('[worker] appointmentConsumer running…');
})();
