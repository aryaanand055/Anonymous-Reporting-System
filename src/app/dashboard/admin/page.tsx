import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardView } from "@/components/DashboardView";

export default function AdminDashboardPage() {
  return (
    <DashboardLayout>
      <DashboardView title="Administrative Hub" />
    </DashboardLayout>
  );
}