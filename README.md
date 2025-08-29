# PrairieMed

**PrairieMed** is a bilingual (EN/FR) healthcare information system built with a modern polyglot stack.  
It demonstrates **end-to-end design, development, and deployment** of a real-world EMR & billing solution suitable for clinics or hospitals.

🚀 Built to showcase **enterprise-grade engineering** across **Next.js, Node/TypeScript, Spring Boot, PostgreSQL, MongoDB, Redis, Redpanda/Kafka, and Docker**.

**Minimal story:** Appointment → Invoice → Email → GraphQL → Audit Log → Dashboard
![CI](https://github.com/jmjabayon928/prairiemed/actions/workflows/ci.yml/badge.svg)

---

## ✨ Features

### Core Modules
- **Appointments** – Schedule, update, and manage patient visits.
- **Billing** – Invoices generated automatically from appointments.
- **Patients** – Securely manage patient demographic records.
- **Audit Logging** – MongoDB + Kafka pipeline for compliance & traceability.
- **Dashboard** – Real-time billing summary tiles with counts/amounts.
- **Notifications** – Email delivery of invoices via Mailpit (dev/test).

### Integration Highlights
- **Event-driven design**  
  - `appointment.created` → triggers billing pipeline  
  - `invoice.created` → logged in MongoDB, emailed to patient
- **GraphQL API**  
  - Unified `patient(id).billingSummary` queries  
  - Bearer-secured resolvers (`Authorization: Bearer dev-admin`)
- **Spring Boot REST**  
  - `/api/billing/patients/{id}/summary` (Actuator health)
- **Dockerized micro-stack**  
  - `docker compose up` runs Postgres, MongoDB, Redis, Redpanda, Mailpit, Billing, Invoice Worker, Audit Logger

### Stretch Goals Completed
- JWT forwarding to Billing REST (Spring filter)
- `/audit/logs` page in Next.js
- Consistent dashboard styling
- Documentation + screenshots for LinkedIn showcase

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router, React Server Components, i18n with `next-intl`, Tailwind, optional shadcn/ui)
- Apollo Client for GraphQL
- Recharts/ApexCharts for dashboard tiles

**Backend**
- Node.js + Express (GraphQL API, REST proxy, workers)
- Spring Boot (Billing microservice, secured REST)

**Databases**
- PostgreSQL (core EMR + appointments + invoices)
- MongoDB (audit log store with indexes & TTL)
- Redis (caching, sessions)

**Messaging**
- Redpanda (Kafka-compatible broker for events)
- kafkajs (Node consumers/producers)

**DevOps**
- Docker Compose (multi-container setup)
- GitHub Actions (CI/CD)
- Jest / RTL / Supertest / Vitest (tests)
- Puppeteer/PDFKit (PDF export options)

---

## 📡 Services & Ports (local)

| Service          | URL / Port                                 |
|------------------|---------------------------------------------|
| Next.js (web)    | http://localhost:3000                       |
| GraphQL (Node)   | http://localhost:4000/graphql  <!-- If you actually use :4001, change here --> |
| Spring Billing   | http://localhost:8081 (health: `/actuator/health`) |
| Mailpit (SMTP/UI)| SMTP :1025 • UI: http://localhost:8025      |
| Postgres         | :5432                                       |
| MongoDB          | :27017                                      |
| Redis            | :6379                                       |
| Redpanda         | :9092 (broker)                              |

---

## 📸 Screenshots

Add screenshots under `/docs/screenshots` and link them here:

- **Appointments → Invoice Flow** – GraphQL mutation → draft invoice row → email in Mailpit  
- **Audit Logs** – MongoDB doc showing `invoice.created` payload with timestamp  
- **Dashboard** – Billing tile with draft/paid counts and fallback “No data”  
- **REST + GraphQL Integration** – Patient billing summary from Spring REST via GraphQL resolver

---

## ⚡ Quick Start (Windows / PowerShell)

### Prerequisites
- Node.js **v18.17+** (v22 also OK)
- pnpm **v9+**
- Java **21+**
- Docker Desktop

### Setup
```powershell
# 1) Infra
cd .\infra\docker
docker compose up -d

# 2) App (new terminal at repo root)
pnpm install
pnpm run dev:all              # web + api + gql

# 3) Workers (optional, separate terminals)
pnpm run dev:worker:audit
pnpm run dev:worker:invoice
```

**Mailpit UI:** http://localhost:8025  
**GraphQL:** http://localhost:4000/graphql  <!-- If you actually use :4001, change here -->  
Header: `Authorization: Bearer dev-admin`

**Billing REST health:** `GET http://localhost:8081/actuator/health`  
**Billing summary (example):**  
`GET http://localhost:8081/api/billing/patients/767b8d60-7e6b-410f-9de5-cb42292d3c61/summary`

---

## 🔑 Demo IDs

- **DEMO_PATIENT_ID:** `767b8d60-7e6b-410f-9de5-cb42292d3c61`  
  (Used by the Dashboard Billing tile to render totals.)

---

## 🧪 Verify

- **GraphQL**: http://localhost:4000/graphql  <!-- If you actually use :4001, change here -->  
  ```graphql
  query Billing($id: ID!) {
    patient(id: $id) {
      billingSummary {
        totals { draftCount draftAmount paidCount paidAmount currency }
      }
    }
  }
  ```
  Variables:
  ```json
  { "id": "767b8d60-7e6b-410f-9de5-cb42292d3c61" }
  ```

- **Next.js Dashboard**: http://localhost:3000  
- **Mailpit**: http://localhost:8025  
- **Redpanda topics**:
  ```powershell
  rpk topic list
  rpk group list
  ```

---

## ✅ Test Checklist

- [x] Appointment → `appointment.created` Kafka event emitted  
- [x] Billing service consumes & drafts invoice  
- [x] Invoice worker emails → visible in Mailpit  
- [x] Audit Logger inserts `invoice.created` doc in MongoDB  
- [x] GraphQL `patient.billingSummary` returns totals  
- [x] Dashboard tile renders draft/paid counts + amounts  
- [x] `/audit/logs` page shows audit entries  
- [x] JWT required for REST billing API

---

## 📂 Project Structure

```
src/
 ├─ app/                 # Next.js frontend (App Router)
 ├─ backend/             # Express GraphQL API & services
 │   ├─ graphql/         # Schema & resolvers
 │   ├─ workers/         # Kafka consumers (invoice, audit)
 │   └─ services/        # Billing proxy, tokens, auth
 ├─ lib/                 # Shared client libs (billing.ts, auth.ts)
 └─ types/               # TypeScript types
workers/
 ├─ audit-logger/        # consumes topics → Mongo audit_logs
 └─ invoice-worker.ts    # consumes invoice.created → Mongo billing_events
infra/
 └─ docker/              # compose files + .env
docs/
 ├─ flow-e2e.md          # end-to-end walkthrough
 ├─ screenshots/         # curated images w/ captions
 └─ diagrams/            # mermaid/draw.io diagrams
```

---

## 🧭 End-to-End Flow (short)

1. Create **Appointment** → emits `appointment.created`  
2. **Billing** service creates an **Invoice** → emits `invoice.created`  
3. **Email** lands in **Mailpit**  
4. Workers persist:  
   - `audit-logger` → **Mongo `audit_logs`** (index `{eventType:1, timestamp:-1}`)  
   - `invoice-worker` → **Mongo `billing_events`** (upsert by `invoiceId`)  
5. **GraphQL** exposes `patient(id).billingSummary`  
6. Dashboard **Billing tile** renders totals

---

## 🔧 Common Scripts

```powershell
pnpm run dev:web               # Next.js
pnpm run dev:api               # Express
pnpm run dev:gql               # Apollo Server
pnpm run dev:all               # web+api+gql together
pnpm run dev:worker:audit      # audit-logger worker
pnpm run dev:worker:invoice    # invoice worker
pnpm run typecheck             # strict TS check (no emit)
pnpm run docker:up             # core infra up (compose)
pnpm run docker:down           # stop infra
```

---

## 🧩 Troubleshooting

- **Billing health**
  ```
  GET http://localhost:8081/actuator/health
  ```
- **GraphQL ping (PowerShell)**
  ```powershell
  iwr http://localhost:4000/graphql -UseBasicParsing -Method POST -ContentType "application/json" -Body (@{ query = "{ __typename }" } | ConvertTo-Json)
  ```
- **Redpanda topics**
  ```powershell
  rpk topic list
  rpk group list
  ```
- **Workers**  
  Check container logs or local terminals for parse errors; invalid messages are recorded into `audit_logs` with `invalid: true`.

---

## 🔒 Security Notes

- JWT forwarding enabled for Billing REST  
- Audit logs immutable, indexed by `{ eventType, timestamp }`  
- Optional TTL index for log retention (e.g., 90d)  
- All services run in an isolated Docker network

---

## 🌍 Bilingual Support

- English + French strings powered by `next-intl`  
- Translation files under `src/i18n/`

---

## 🎯 Why This Project?

PrairieMed was designed as a **portfolio-grade, production-style project** to demonstrate:
- Full-stack system design
- Microservices with messaging
- Strong typing (TypeScript + Kotlin)
- Secure APIs (JWT)
- DevOps pipelines

---

## 📜 License

MIT — use freely, attribution appreciated.
