"use client";

import { useEffect, useState } from "react";
import { getReports } from "@/app/actions/reports";
import { Report, Department, Priority, ReportStatus } from "@/types/reports";
import { ReportCard } from "@/components/ReportCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, LayoutGrid, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardViewProps {
  department?: Department;
  title: string;
}

export function DashboardView({ department, title }: DashboardViewProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const fetchedReports = await getReports(department);
      setReports(fetchedReports);
      setLoading(false);
    }
    loadReports();
  }, [department]);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(search.toLowerCase()) ||
      report.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-muted pb-6">
        <div>
          <h1 className="text-3xl font-headline font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of active incident reports.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-lg border border-muted">
          <div className="text-center px-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold text-foreground">{reports.length}</p>
          </div>
          <div className="w-px h-8 bg-muted" />
          <div className="text-center px-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-xl font-bold text-foreground">
              {reports.filter((r) => r.status === "pending").length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports by title or location..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select onValueChange={(v) => setStatusFilter(v as any)} defaultValue="all">
          <SelectTrigger>
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(v) => setPriorityFilter(v as any)} defaultValue="all">
          <SelectTrigger>
            <SelectValue placeholder="Filter Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-muted">
          <p className="text-muted-foreground font-medium">No reports matching your criteria found.</p>
        </div>
      )}
    </div>
  );
}