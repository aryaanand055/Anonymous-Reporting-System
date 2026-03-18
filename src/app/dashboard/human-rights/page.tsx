import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardView } from "@/components/DashboardView";

export default function HumanRightsDashboardPage() {
  return (
    <DashboardLayout>
      <DashboardView department="human_rights" title="Human Rights Dashboard" />
    </DashboardLayout>
  );
}