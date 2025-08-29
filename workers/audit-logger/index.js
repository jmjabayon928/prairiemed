import { Kafka } from "kafkajs";
import { MongoClient } from "mongodb";

const brokers = process.env.KAFKA_BROKERS?.split(",") ?? ["redpanda:29092"];
const mongoUri = process.env.MONGODB_URI || "mongodb://mongodb:27017";
const mongoDb = process.env.MONGODB_DB || "prairiemed";
const mongoCollection = process.env.MONGODB_COLLECTION || "audit_logs";

const kafka = new Kafka({ clientId: "audit-logger", brokers });
const consumer = kafka.consumer({ groupId: "audit-logger-group" });

async function run() {
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const db = mongo.db(mongoDb);
  const logs = db.collection(mongoCollection);

  await consumer.connect();
  await consumer.subscribe({ topic: "invoice.created", fromBeginning: false });

  console.log("[audit-logger] Connected. Listening for invoice.created...");
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      let payload;
      try {
        payload = JSON.parse(value);
      } catch (e) {
        console.error("[audit-logger] Invalid JSON, skipping:", value);
        return;
      }

      const doc = {
        eventType: topic,
        timestamp: new Date(),
        partition,
        offset: message.offset,
        key: message.key?.toString() ?? null,
        headers: Object.fromEntries(
          Object.entries(message.headers ?? {}).map(([k, v]) => [k, v?.toString() ?? null])
        ),
        payload
      };

      await logs.insertOne(doc);
      console.log("[audit-logger] Inserted audit log:", doc.offset);
    }
  });
}

run().catch((err) => {
  console.error("[audit-logger] Fatal:", err);
  process.exit(1);
});
