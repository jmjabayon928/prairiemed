// workers/audit-logger/index.ts
import { Kafka, logLevel } from "kafkajs";
import { MongoClient } from "mongodb";
import {
  AppointmentCreatedEventSchema,
  InvoiceCreatedEventSchema,
  PaymentReceivedEventSchema,
  type AnyPrairieEvent,
} from "@/types/events";

// ---------- Env ----------
const BROKERS = (process.env.REDPANDA_BROKERS ?? "localhost:9092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TOPIC_APPT = process.env.KAFKA_TOPIC_APPOINTMENT ?? "appointment.created";
const TOPIC_INVOICE = process.env.KAFKA_TOPIC_INVOICE ?? "invoice.created";
const TOPIC_PAYMENT = process.env.KAFKA_TOPIC_PAYMENT ?? "payment.received";

const GROUP_ID = process.env.AUDIT_LOGGER_GROUP_ID ?? "prairiemed-audit-logger";

const MONGO_URL = process.env.MONGO_URL ?? "mongodb://root:example@localhost:27017";
const MONGO_DB = process.env.MONGO_DB ?? "prairiemed";
const MONGO_COLL = process.env.MONGO_AUDIT_COLLECTION ?? "audit_logs";

// ---------- Clients ----------
const kafka = new Kafka({
  clientId: "prairiemed-audit-logger",
  brokers: BROKERS,
  logLevel: logLevel.INFO,
});

const consumer = kafka.consumer({ groupId: GROUP_ID });
const mongoClient = new MongoClient(MONGO_URL, {});

async function ensureIndexes() {
  const db = mongoClient.db(MONGO_DB);
  const coll = db.collection(MONGO_COLL);
  // Your required compound index
  await coll.createIndex({ eventType: 1, timestamp: -1 });
  // Helpful additional indexes
  await coll.createIndex({ topic: 1, offset: -1 });
  await coll.createIndex({ patientId: 1, timestamp: -1 });
}

function validateEvent(topic: string, payload: unknown): AnyPrairieEvent | null {
  if (topic === TOPIC_INVOICE) {
    const parsed = InvoiceCreatedEventSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }
  if (topic === TOPIC_PAYMENT) {
    const parsed = PaymentReceivedEventSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }
  if (topic === TOPIC_APPT) {
    const parsed = AppointmentCreatedEventSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  }
  return null;
}

// ---------- Main ----------
async function main(): Promise<void> {
  await mongoClient.connect();
  await ensureIndexes();

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_APPT, fromBeginning: false });
  await consumer.subscribe({ topic: TOPIC_INVOICE, fromBeginning: false });
  await consumer.subscribe({ topic: TOPIC_PAYMENT, fromBeginning: false });

  const db = mongoClient.db(MONGO_DB);
  const coll = db.collection(MONGO_COLL);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const raw = message.value?.toString("utf8") ?? "{}";
        const parsed = JSON.parse(raw) as unknown;

        const evt = validateEvent(topic, parsed);
        if (!evt) {
          // Skip invalid messages but keep a trace for debugging
          await coll.insertOne({
            topic,
            partition,
            offset: message.offset,
            invalid: true,
            raw,
            headers: message.headers ?? {},
            receivedAt: new Date().toISOString(),
          });
          return;
        }

        // Normalize timestamp
        const ts =
          "timestamp" in evt && typeof evt.timestamp === "string"
            ? evt.timestamp
            : new Date().toISOString();

        const doc = {
          ...evt,
          topic,
          partition,
          offset: message.offset,
          headers: message.headers ?? {},
          timestamp: ts,
          receivedAt: new Date().toISOString(),
        };

        await coll.insertOne(doc);
      } catch (err) {
        // Avoid crashing on malformed messages
        console.error("[audit-logger] error:", err);
      }
    },
  });

  console.log(
    `[audit-logger] running. brokers=${BROKERS.join(
      ","
    )} topics=[${TOPIC_APPT}, ${TOPIC_INVOICE}, ${TOPIC_PAYMENT}]`
  );
}

// ---------- Shutdown ----------
function shutdown(reason: string): void {
  console.log(`[audit-logger] shutting down: ${reason}`);
  void consumer
    .disconnect()
    .catch((e) => console.error("[audit-logger] consumer disconnect error:", e))
    .finally(() => {
      void mongoClient
        .close()
        .catch((e) => console.error("[audit-logger] mongo close error:", e))
        .finally(() => process.exit(0));
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------- Start ----------
void main().catch((e) => {
  console.error("[audit-logger] fatal:", e);
  process.exit(1);
});
