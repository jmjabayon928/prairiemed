import { Kafka, logLevel } from 'kafkajs';


const brokers = [process.env.KAFKA_BROKER ?? 'localhost:9092'];


export const kafka = new Kafka({
clientId: 'prairiemed-api',
brokers,
logLevel: logLevel.ERROR,
});


export const kafkaProducer = kafka.producer();


export async function initKafka(): Promise<void> {
await kafkaProducer.connect();
}


// Convenience helper for emitting JSON messages
export async function emit(topic: string, payload: unknown): Promise<void> {
await kafkaProducer.send({
topic,
messages: [{ value: JSON.stringify(payload) }],
});
}