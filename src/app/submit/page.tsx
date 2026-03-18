import { ReportForm } from "@/components/ReportForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function SubmitReportPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard Selection
        </Link>
        <ReportForm />
      </div>
    </div>
  );
}