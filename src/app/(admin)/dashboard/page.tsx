import BillingTile from "@/components/dashboard/BillingTile";

export const revalidate = 30;

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <BillingTile />
      </div>
    </div>
  );
}
