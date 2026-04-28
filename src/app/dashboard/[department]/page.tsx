import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DashboardView } from "@/components/DashboardView";
import { DEPARTMENT_DIRECTORY } from "@/lib/report-routing";

interface DepartmentDashboardPageProps {
    params: { department: string };
}

export default function DepartmentDashboardPage({ params }: DepartmentDashboardPageProps) {
    const departmentEntry = DEPARTMENT_DIRECTORY.find((entry) => entry.slug === params.department);

    if (!departmentEntry) {
        notFound();
    }

    return (
        <DashboardLayout>
            <DashboardView department={departmentEntry.department} title={departmentEntry.title} />
        </DashboardLayout>
    );
}