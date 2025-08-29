#!/usr/bin/env bash
set -euo pipefail

BROKERS="${BROKERS:-redpanda:29092}"

topics=(
  "appointment.created"
  "invoice.created"
  "payment.received"
)

for t in "${topics[@]}"; do
  echo "Creating topic: $t"
  rpk topic create "$t" --brokers "$BROKERS" --if-not-exists || true
done

echo "Topics:"
rpk topic list --brokers "$BROKERS"
