# End-to-End Flow (PrairieMed)

**Story:** Appointment → Invoice → Email → GraphQL → Audit Log → Dashboard

This doc walks you through running everything locally and validating the full path. Commands are tailored for **Windows / PowerShell**.

---

## 0) Prereqs & Environment

- Docker Desktop
- Node 18.17+ and pnpm 9+
- Java 21 (Spring Billing)
- (Optional) rpk CLI for Redpanda

Environment defaults used here:

- **GraphQL**: http://localhost:4000/graphql (Header: `Authorization: Bearer dev-admin`)
- **Billing REST**: http://localhost:8081
- **Mailpit**: http://localhost:8025
- **Demo Patient**: `DEMO_PATIENT_ID=767b8d60-7e6b-410f-9de5-cb42292d3c61`

---

## 1) Start Everything

```powershell
# Infra
cd .\infra\docker
docker compose up -d

# App (new terminal at repo root)
pnpm install
pnpm run dev:all            # web + api + gql

# Workers (two terminals)
pnpm run dev:worker:audit
pnpm run dev:worker:invoice
```

Health checks:

```powershell
# Billing
iwr http://localhost:8081/actuator/health -UseBasicParsing

# GraphQL "ping"
iwr http://localhost:4000/graphql -UseBasicParsing -Method POST -ContentType "application/json" -Body (@{ query = "{ __typename }" } | ConvertTo-Json)

# (Optional) Redpanda topics/groups
rpk topic list
rpk group list
```

---

## 2) Create an Appointment → Generate an Invoice

### Option A — via your UI/API (preferred if implemented)
Use the app to create an **Appointment** for the **Demo Patient**. This should emit `appointment.created`, and your Billing service will create a draft invoice (emitting `invoice.created`).

### Option B — simulate events (for demo / if UI step isn’t ready yet)

#### B1) Simulate `appointment.created` (optional)
If your flow listens to this topic, you can produce an event:

```powershell
$evt = @{
  eventType = "appointment.created"
  appointmentId = [guid]::NewGuid().ToString()
  patientId = $env:DEMO_PATIENT_ID
  providerId = "demo-provider-001"
  timestamp = (Get-Date).ToString("o")
} | ConvertTo-Json -Compress

# replace 'redpanda:9092' with the correct broker if needed; on host it's usually localhost:9092
echo $evt | rpk topic produce appointment.created
```

#### B2) Simulate `invoice.created` (direct)
If you only need to drive the rest of the pipeline, producing `invoice.created` is enough:

```powershell
$evt = @{
  eventType = "invoice.created"
  invoiceId = [guid]::NewGuid().ToString()
  patientId = $env:DEMO_PATIENT_ID
  amount = 150
  currency = "CAD"
  timestamp = (Get-Date).ToString("o")
} | ConvertTo-Json -Compress

echo $evt | rpk topic produce invoice.created
```

> Tip: On Windows shells, if `rpk` isn’t in PATH, open Redpanda container and run `rpk` inside:
> ```powershell
> docker exec -it <redpanda-container-name> rpk topic produce invoice.created
> ```

---

## 3) Email: Verify in Mailpit

Open **http://localhost:8025** and look for an invoice-related email.  
(If your flow doesn’t send email on `invoice.created` yet, skip this and continue.)

---

## 4) Workers & MongoDB

- **audit-logger** should append events to **Mongo `audit_logs`**.
- **invoice-worker** should upsert a projection into **Mongo `billing_events`**.

Quick checks:

```powershell
# Container logs (if running in Docker)
docker logs <audit-logger-container-name> --since=2m
docker logs <invoice-worker-container-name> --since=2m
```

Using **mongosh**:

```powershell
mongosh --host localhost --eval "db.getSiblingDB('prairiemed').audit_logs.find({}, {eventType:1,timestamp:1}).sort({timestamp:-1}).limit(5).toArray()"
mongosh --host localhost --eval "db.getSiblingDB('prairiemed').billing_events.find({}, {invoiceId:1,patientId:1,amount:1,currency:1}).sort({createdAt:-1}).limit(5).toArray()"
```

> `audit_logs` has a compound index `{ eventType: 1, timestamp: -1 }`.  
> `billing_events` should have `{ invoiceId: 1 }` (unique) and `{ patientId: 1, createdAt: -1 }`.

---

## 5) GraphQL Billing Summary

Open Apollo Sandbox at **http://localhost:4000/graphql** (or your GraphQL UI) and run:

**Headers**
```
Authorization: Bearer dev-admin
```

**Query**
```graphql
query Billing($id: ID!) {
  patient(id: $id) {
    billingSummary {
      totals {
        draftCount
        draftAmount
        paidCount
        paidAmount
        currency
      }
    }
  }
}
```

**Variables**
```json
{ "id": "767b8d60-7e6b-410f-9de5-cb42292d3c61" }
```

You should see non-zero counts/amounts after the simulated `invoice.created` or a real invoice creation via the app.

---

## 6) Dashboard

Open **http://localhost:3000** and confirm the **Billing** tile shows totals using `summary.totals` and falls back to “No data” if the Billing service is down or `DEMO_PATIENT_ID` is unset.

---

## 7) Troubleshooting

- **Billing health**  
  `GET http://localhost:8081/actuator/health`

- **GraphQL header missing**  
  Ensure `Authorization: Bearer dev-admin` is present.

- **No events consumed**  
  - Check Redpanda is running and the correct **brokers** are configured.
  - `rpk topic list` and `rpk group list` should show activity.
  - See worker logs for JSON parse or validation errors.

- **Mongo empty**  
  - Verify worker connection string and DB/collection names.
  - Ensure indexes exist (workers create them on startup).

- **Dashboard shows “No data”**  
  - Set `DEMO_PATIENT_ID` in `.env.local`.
  - Confirm Billing REST summary works:
    `GET /api/billing/patients/{id}/summary`

---

## 8) Suggested Screenshots

Save to `docs/screenshots` with short captions:

1. `01-dashboard-billing.png` – Billing tile showing totals  
2. `02-mailpit-invoice.png` – Invoice email in Mailpit  
3. `03-graphql-billing-summary.png` – Apollo Sandbox query and result  
4. `04-rpk-topics.png` – `rpk topic list` output  
5. `05-audit-logs-mongo.png` – Sample `audit_logs` document
