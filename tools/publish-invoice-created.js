import { Kafka } from "kafkajs";

const kafka = new Kafka({ clientId: "test-publisher", brokers: ["localhost:9092"] });
const producer = kafka.producer();

const payload = {
  invoiceId: "inv_test_" + Date.now(),
  patientId: "patient_demo_123",
  total: 150.25,
  currency: "CAD",
  createdAt: new Date().toISOString(),
  source: "synthetic-test"
};

await producer.connect();
await producer.send({
  topic: "invoice.created",
  messages: [{ value: JSON.stringify(payload) }]
});
await producer.disconnect();

console.log("Sent invoice.created:", payload);
