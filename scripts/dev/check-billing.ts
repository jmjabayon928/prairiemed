/**
 * Quick local check for Billing REST summary.
 * Usage:
 *   pnpm dlx tsx scripts/dev/check-billing.ts 767b8d60-7e6b-410f-9de5-cb42292d3c61
 * or
 *   DEMO_PATIENT_ID=... pnpm dlx tsx scripts/dev/check-billing.ts
 */

const BASE = process.env.BILLING_BASE_URL ?? "http://localhost:8081";

async function main() {
  const id = process.argv[2] || process.env.DEMO_PATIENT_ID;
  if (!id) {
    console.error("Provide patient id: tsx scripts/dev/check-billing.ts <patientId> OR set DEMO_PATIENT_ID");
    process.exit(1);
  }
  const url = `${BASE}/api/billing/patients/${encodeURIComponent(id)}/summary`;
  console.log(`GET ${url}`);

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    console.error("Billing responded:", res.status, res.statusText);
    process.exit(2);
  }
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
