import Link from "next/link";
import { ChevronLeft, Cpu, ShieldCheck, FileJson } from "lucide-react";

export default function SubmitReportPage() {
  const samplePayload = `{
  "location": "Chennai",
  "district": "Tinaka",
  "date": "April 18th",
  "institution_type": "government hospital",
  "issue_type": "sanitation and cleanliness",
  "severity_level": "high",
  "emotional_indicator": "frustration",
  "raw_text": "Ward B has overflowing bins and foul smell near patient beds."
}`;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-headline font-bold">Device-Based Ingestion Enabled</h1>
                <p className="text-muted-foreground mt-2">
                  Reports are now collected from hardware devices only. Manual form submission has been disabled.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="font-headline text-lg font-semibold inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                API Requirements
              </h2>
              <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
                <li>POST to /api/reports</li>
                <li>Header X-API-KEY must match HARDWARE_API_KEY</li>
                <li>JSON body must include required structured fields</li>
                <li>Optional raw_text is stored for manager review</li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="font-headline text-lg font-semibold inline-flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" />
                Sample Payload
              </h2>
              <pre className="text-xs overflow-auto rounded-md bg-muted p-3 leading-relaxed">
                {samplePayload}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}