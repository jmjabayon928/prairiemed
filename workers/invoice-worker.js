import { Kafka, logLevel } from 'kafkajs'
import nodemailer from 'nodemailer'

const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || 'localhost:9092').split(',')
const smtpHost = process.env.SMTP_HOST || 'localhost'
const smtpPort = Number(process.env.SMTP_PORT || 1025)

const kafka = new Kafka({ clientId: 'invoice-worker', brokers, logLevel: logLevel.ERROR })
const consumer = kafka.consumer({ groupId: 'invoice-worker' })

const mailer = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: false })

async function run() {
  await consumer.connect()
  await consumer.subscribe({ topic: 'invoice.created', fromBeginning: false })

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() || '{}'
      let evt
      try {
        evt = JSON.parse(raw)
      } catch {
        console.warn('[worker] bad JSON:', raw)
        return
      }

      await mailer.sendMail({
        from: 'no-reply@prairiemed.local',
        to: 'patient@example.com',
        subject: `Invoice created: ${evt.id}`,
        text: `Invoice ${evt.id} for patient ${evt.patientId} was created with total ${evt.totalAmount} ${evt.currency}.`,
      })

      console.log('[worker] emailed invoice.created', evt.id)
    },
  })
}

run().catch((err) => {
  console.error('[worker] fatal', err)
  process.exit(1)
})
