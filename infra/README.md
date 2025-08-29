# PrairieMed – Infrastructure

This folder contains **Dockerized infra** for the PrairieMed demo stack:

- **PostgreSQL 16** – transactional DB  
- **Redis 7** – cache / queues  
- **Redpanda (Kafka)** – event streaming (`appointment.created`, `invoice.created`, `payment.received`)  
- **MongoDB 7** – audit logs  
- **Mailpit** – local SMTP + web inbox (:8025)  
- **Billing (Spring Boot)** – REST service (:8081)  
- **Workers (Node.js)** – `invoice-worker` and `audit-logger`

Secrets live in `.env` which is **not** committed. Example values are in `.env.example`.

---

## Quick Start

```powershell
# from repo root
cd infra/docker
Copy-Item .env.example .env -Force
docker compose up -d --build
docker ps --format "table {{.Names}}\t{{.Status}}"
