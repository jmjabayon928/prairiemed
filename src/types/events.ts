// src/types/events.ts
import { z } from "zod";

// -------- Base event --------
export const BaseEventSchema = z.object({
  eventType: z.string(),
  timestamp: z.string().datetime().or(z.string().min(1)), // allow already-valid ISO strings
});

// -------- Specific events --------
export const InvoiceCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("invoice.created"),
  invoiceId: z.string().min(1),
  patientId: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.enum(["CAD", "USD"]).default("CAD"),
});

export const PaymentReceivedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("payment.received"),
  paymentId: z.string().min(1),
  invoiceId: z.string().min(1),
  patientId: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.enum(["CAD", "USD"]).default("CAD"),
});

export const AppointmentCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal("appointment.created"),
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  providerId: z.string().min(1),
});

export type InvoiceCreatedEvent = z.infer<typeof InvoiceCreatedEventSchema>;
export type PaymentReceivedEvent = z.infer<typeof PaymentReceivedEventSchema>;
export type AppointmentCreatedEvent = z.infer<typeof AppointmentCreatedEventSchema>;

export type AnyPrairieEvent =
  | InvoiceCreatedEvent
  | PaymentReceivedEvent
  | AppointmentCreatedEvent;
