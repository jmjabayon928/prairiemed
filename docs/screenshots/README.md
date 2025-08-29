# Screenshots Guide

Curate a small set of images that tells the PrairieMed story end-to-end.

## What to capture (5–6 images)

1. **Dashboard – Billing tile**  
   *File:* `01-dashboard-billing.png`  
   *How:* Open http://localhost:3000 and capture the tile with totals (or “No data” fallback).

2. **Mailpit – Invoice email**  
   *File:* `02-mailpit-invoice.png`  
   *How:* Open http://localhost:8025 and capture the invoice email.

3. **GraphQL – Billing summary query**  
   *File:* `03-graphql-billing-summary.png`  
   *How:* Open http://localhost:4000/graphql, run the Billing query with header `Authorization: Bearer dev-admin` and variables for the demo patient.

4. **Redpanda – Topics list**  
   *File:* `04-rpk-topics.png`  
   *How:* In a terminal: `rpk topic list` (or inside the Redpanda container). Capture the output.

5. **Mongo – audit_logs sample**  
   *File:* `05-audit-logs-mongo.png`  
   *How:* Show a sample document from `audit_logs` in a Mongo client or `mongosh`.

(Optional) 6. **Billing REST Health**  
   *File:* `06-billing-health.png`  
   *How:* Screenshot `GET http://localhost:8081/actuator/health` response.

## Suggested captions

Create a simple captions file `captions.md` in this folder (sample below), or embed captions in the main README.

```md
# Captions

- **01-dashboard-billing.png** — “Dashboard Billing tile showing draft/paid totals for the demo patient.”
- **02-mailpit-invoice.png** — “Invoice email rendered in Mailpit (dev/test).”
- **03-graphql-billing-summary.png** — “Apollo Sandbox query for patient(id).billingSummary.”
- **04-rpk-topics.png** — “Redpanda topics: appointment.created, invoice.created, payment.received.”
- **05-audit-logs-mongo.png** — “audit_logs document appended by the audit-logger worker.”
- **06-billing-health.png** — “Spring Billing /actuator/health is UP.”
```

## Linking from README

Add a small gallery section in your README:

```md
## Screenshots

|  |  |
|---|---|
| ![Billing tile](docs/screenshots/01-dashboard-billing.png) | ![Mailpit](docs/screenshots/02-mailpit-invoice.png) |
| ![GraphQL](docs/screenshots/03-graphql-billing-summary.png) | ![Topics](docs/screenshots/04-rpk-topics.png) |
| ![Audit logs](docs/screenshots/05-audit-logs-mongo.png) | ![Health](docs/screenshots/06-billing-health.png) |
```

## Tips

- Keep each image focused (crop away unrelated UI).
- Use light theme for consistency.
- Keep filenames and numbers stable; they’re referenced in docs.
