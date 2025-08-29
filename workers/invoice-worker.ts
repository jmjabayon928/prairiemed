// workers/invoice-worker.ts
import { Kafka, logLevel } from "kafkajs";
import { MongoClient } from "mongodb";
import { InvoiceCreatedEventSchema, type InvoiceCreatedEvent } from "@/types/events";

// ---------- Env ----------
const BROKERS = (process.env.REDPANDA_BROKERS ?? "localhost:9092")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TOPIC_INVOICE = process.env.KAFKA_TOPIC_INVOICE ?? "invoice.created";
const GROUP_ID = process.env.INVOICE_WORKER_GROUP_ID ?? "prairiemed-invoice-worker";

const MONGO_URL = process.env.MONGO_URL ?? "mongodb://root:example@localhost:27017";
const MONGO_DB = process.env.MONGO_DB ?? "prairiemed";
const MONGO_COLL = process.env.MONGO_BILLING_EVENTS_COLLECTION ?? "billing_events";

// ---------- Clients ----------
const kafka = new Kafka({
  clientId: "prairiemed-invoice-worker",
  brokers: BROKERS,
  logLevel: logLevel.INFO,
});

const consumer = kafka.consumer({ groupId: GROUP_ID });
const mongoClient = new MongoClient(MONGO_URL, {});

async function ensureIndexes() {
  const db = mongoClient.db(MONGO_DB);
  const coll = db.collection(MONGO_COLL);
  await coll.createIndex({ invoiceId: 1 }, { unique: true });
  await coll.createIndex({ patientId: 1, createdAt: -1 });
}

// Normalize/derive a doc for quick reads
function toBillingEventDoc(evt: InvoiceCreatedEvent) {
  const createdAt = new Date(evt.timestamp ?? Date.now()).toISOString();
  const amountCents = Math.round(evt.amount * 100);
  return {
    eventType: evt.eventType,
    invoiceId: evt.invoiceId,
    patientId: evt.patientId,
    currency: evt.currency,
    amount: evt.amount,
    amountCents,
    createdAt,
    updatedAt: new Date().toISOString(),
  };
}

// ---------- Main ----------
async function main(): Promise<void> {
  await mongoClient.connect();
  await ensureIndexes();

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC_INVOICE, fromBeginning: false });

  const db = mongoClient.db(MONGO_DB);
  const coll = db.collection(MONGO_COLL);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const raw = message.value?.toString("utf8") ?? "{}";
        const parsed = JSON.parse(raw) as unknown;

        const res = InvoiceCreatedEventSchema.safeParse(parsed);
        if (!res.success) {
          console.warn("[invoice-worker] invalid invoice.created:", res.error.flatten());
          return;
        }

        const evt = res.data;
        const doc = toBillingEventDoc(evt);

        // Upsert by invoiceId for idempotency
        await coll.updateOne(
          { invoiceId: evt.invoiceId },
          { $set: doc, $setOnInsert: { firstSeenAt: new Date().toISOString() } },
          { upsert: true }
        );
      } catch (err) {
        console.error("[invoice-worker] error:", err);
      }
    },
  });

  console.log(
    `[invoice-worker] running. brokers=${BROKERS.join(",")} topic=${TOPIC_INVOICE}`
  );
}

// ---------- Shutdown ----------
function shutdown(reason: string): void {
  console.log(`[invoice-worker] shutting down: ${reason}`);
  void consumer
    .disconnect()
    .catch((e) => console.error("[invoice-worker] consumer disconnect error:", e))
    .finally(() => {
      void mongoClient
        .close()
        .catch((e) => console.error("[invoice-worker] mongo close error:", e))
        .finally(() => process.exit(0));
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------- Start ----------
void main().catch((e) => {
  console.error("[invoice-worker] fatal:", e);
  process.exit(1);
});
