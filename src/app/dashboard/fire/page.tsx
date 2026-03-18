import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardView } from "@/components/DashboardView";

export default function FireDashboardPage() {
  return (
    <DashboardLayout>
      <DashboardView department="fire" title="Fire Department Response" />
    </DashboardLayout>
  );
}