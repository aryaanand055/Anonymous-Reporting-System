"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STATUS_LABELS, ReportStatus } from "@/types/reports";

type TrackApiResponse = {
  success: boolean;
  report?: {
    trackingId: string;
    status: ReportStatus;
    issueType: string;
    location: string;
    createdAt: string;
  };
  error?: string;
};

export default function TrackPage() {
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackApiResponse["report"] | null>(null);

  const lookupStatus = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const normalized = trackingId.trim().toUpperCase();
      if (!normalized) {
        setError("Please enter a tracking ID.");
        return;
      }

      const response = await fetch(`/api/reports?trackingId=${encodeURIComponent(normalized)}`);
      const data: TrackApiResponse = await response.json();

      if (!response.ok || !data.success || !data.report) {
        setError(data.error || "Could not find report status.");
        return;
      }

      setResult(data.report);
    } catch (err) {
      console.error(err);
      setError("Could not fetch report status right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-headline font-bold">Track Report Status</h1>
          <p className="text-muted-foreground">
            Enter your tracking ID to check the current report status.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              Status Lookup
            </CardTitle>
            <CardDescription>Example format: AR-8G7K2M4Q</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Enter tracking ID"
              className="font-mono"
            />
            <Button onClick={lookupStatus} disabled={loading} className="w-full">
              {loading ? "Checking..." : "Check Status"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Report Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Tracking ID:</span>{" "}
                <span className="font-mono font-semibold">{result.trackingId}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span>{" "}
                <span className="font-semibold">{STATUS_LABELS[result.status]}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Issue:</span> {result.issueType}
              </p>
              <p>
                <span className="text-muted-foreground">Location:</span> {result.location}
              </p>
              <p>
                <span className="text-muted-foreground">Submitted:</span>{" "}
                {format(new Date(result.createdAt), "MMM d, yyyy h:mm a")}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
