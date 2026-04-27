"use client";

import { useMemo, useState } from "react";
import { Report, DEPARTMENT_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/types/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MapPin, Clock, MoreVertical, FileText, Eye, Download, Paperclip } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateReportRouting, updateReportStatus } from "@/app/actions/reports";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ReportCardProps {
  report: Report;
  showAdminActions?: boolean;
}

export function ReportCard({ report, showAdminActions = true }: ReportCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState(0);

  const updateStatus = async (newStatus: Report["status"]) => {
    try {
      await updateReportStatus(report.id, newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const updateRouting = async (updates: { priority?: Report["priority"]; department?: Report["department"] }) => {
    try {
      await updateReportRouting(report.id, updates);
    } catch (error) {
      console.error("Error updating report routing:", error);
    }
  };

  const priorityColors = {
    high: "bg-priority-high text-white border-transparent",
    medium: "bg-priority-medium text-white border-transparent",
    low: "bg-priority-low text-white border-transparent",
  };

  const statusColors = {
    pending: "bg-status-pending/10 text-status-pending border-status-pending/20",
    in_progress: "bg-status-progress/10 text-status-progress border-status-progress/20",
    resolved: "bg-status-resolved/10 text-status-resolved border-status-resolved/20",
  };

  const evidence = report.evidence ?? [];
  const selectedEvidence = useMemo(() => evidence[selectedEvidenceIndex], [evidence, selectedEvidenceIndex]);
  const previewUrl = selectedEvidence
    ? `/api/admin/reports/${encodeURIComponent(report.trackingId)}/evidence/${encodeURIComponent(selectedEvidence.fileId)}`
    : "";
  const isImage = selectedEvidence?.contentType?.startsWith("image/");
  const isPdf = selectedEvidence?.contentType === "application/pdf";

  return (
    <Card className="overflow-hidden border-l-4 border-l-primary/20 hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-headline font-semibold text-foreground leading-tight">
            {report.issueType}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {report.location}, {report.district}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(report.createdAt), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("capitalize px-2 py-0.5", statusColors[report.status])}>
            {STATUS_LABELS[report.status]}
          </Badge>
          {showAdminActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => updateStatus("pending")}>Mark Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("in_progress")}>Mark In Progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus("resolved")}>Mark Resolved</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Priority</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => updateRouting({ priority: "high" })}>Set High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateRouting({ priority: "medium" })}>Set Medium</DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateRouting({ priority: "low" })}>Set Low</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Department</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => updateRouting({ department: "human_rights" })}>
                  Move to Human Rights
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateRouting({ department: "fire" })}>
                  Move to Fire Department
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {report.institutionType} reported on {report.reportDateLabel}. Emotional indicator: {report.emotionalIndicator}.
        </p>

        <div className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Tracking ID
          <span className="font-mono text-foreground">{report.trackingId}</span>
        </div>

        {report.aiSummary && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              AI Insight
            </div>
            <p className="text-xs italic text-foreground leading-snug">
              "{report.aiSummary}"
            </p>
          </div>
        )}

        {report.rawText && (
          <Accordion type="single" collapsible>
            <AccordionItem value="raw-text" className="border rounded-md px-3">
              <AccordionTrigger className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-3">
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Raw Text (Device Input)
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {report.rawText}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-muted">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {DEPARTMENT_LABELS[report.department]}
          </span>
          <div className="flex items-center gap-2">
            {evidence.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-2"
                onClick={() => setEvidenceOpen(true)}
              >
                <Paperclip className="h-4 w-4" />
                Evidence ({evidence.length})
              </Button>
            )}
            <Badge className={cn("capitalize", priorityColors[report.priority])}>
              {PRIORITY_LABELS[report.priority]} Severity
            </Badge>
          </div>
        </div>
      </CardContent>

      <Dialog
        open={evidenceOpen}
        onOpenChange={(open) => {
          setEvidenceOpen(open);
          if (!open) {
            setSelectedEvidenceIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Evidence for {report.trackingId}</DialogTitle>
            <DialogDescription>
              View attached evidence directly in the dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4 min-h-0">
            <div className="space-y-3 overflow-y-auto pr-1 max-h-[65vh]">
              {evidence.map((item, index) => {
                const active = index === selectedEvidenceIndex;
                return (
                  <button
                    key={item.fileId}
                    type="button"
                    onClick={() => setSelectedEvidenceIndex(index)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors",
                      active ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{item.filename}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.contentType}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        #{index + 1}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="min-h-[55vh] flex flex-col rounded-lg border bg-muted/20 overflow-hidden">
              {selectedEvidence ? (
                <>
                  <div className="flex items-center justify-between gap-3 p-4 border-b bg-background/80">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedEvidence.filename}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedEvidence.contentType}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4" />
                        Open
                      </a>
                    </Button>
                  </div>

                  <div className="flex-1 min-h-0 p-4">
                    {isImage ? (
                      <img
                        src={previewUrl}
                        alt={selectedEvidence.filename}
                        className="h-full w-full object-contain rounded-md bg-black/5"
                      />
                    ) : isPdf ? (
                      <iframe
                        src={previewUrl}
                        title={selectedEvidence.filename}
                        className="h-full w-full rounded-md bg-background"
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center gap-3 rounded-md border border-dashed bg-background p-6">
                        <Eye className="h-10 w-10 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Preview unavailable for this file type</p>
                          <p className="text-sm text-muted-foreground">
                            Use Open to view or download the attached evidence.
                          </p>
                        </div>
                        <Button asChild>
                          <a href={previewUrl} target="_blank" rel="noreferrer">
                            Open File
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />
                  <div className="p-4 text-xs text-muted-foreground flex items-center justify-between gap-3">
                    <span>Uploaded evidence is stored privately in GridFS and served only through this dashboard view.</span>
                    <span>File {(selectedEvidence.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6">
                  No evidence selected.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}