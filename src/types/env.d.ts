// src/types/env.d.ts

declare namespace NodeJS {
  interface ProcessEnv {
    // Demo patient for dashboard tile
    DEMO_PATIENT_ID?: string;

    // Billing service base URL (used by src/lib/billing.ts)
    BILLING_BASE_URL?: string;
    BILLING_API_URL?: string;

    // GraphQL auth for local testing
    GRAPHQL_AUTH_BEARER?: string;

    // Workers / infra
    REDPANDA_BROKERS?: string;
    KAFKA_TOPIC_APPOINTMENT?: string;
    KAFKA_TOPIC_INVOICE?: string;
    KAFKA_TOPIC_PAYMENT?: string;

    MONGO_URL?: string;
    MONGO_DB?: string;
    MONGO_AUDIT_COLLECTION?: string;
    MONGO_BILLING_EVENTS_COLLECTION?: string;

    AUDIT_LOGGER_GROUP_ID?: string;
    INVOICE_WORKER_GROUP_ID?: string;
  }
}
