// scripts/check-billing.ts
import 'dotenv/config';
import { fetchPatientBillingSummary } from '../src/lib/billing';

async function main() {
  const patientId = process.env.DEMO_PATIENT_ID ?? '';
  if (!patientId) {
    console.error('DEMO_PATIENT_ID is not set.');
    process.exitCode = 1;
    return;
  }

  const summary = await fetchPatientBillingSummary(patientId);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
