"use client";

import Link from "next/link";
import { Shield, LayoutDashboard, FileText, Settings, LogOut, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-card border-r hidden lg:flex flex-col fixed inset-y-0">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-headline font-bold text-primary tracking-tight text-xl text-balance">Anonymous Reporting</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <Link href="/">
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Main Hub
            </div>
          </Link>
          <div className="h-px bg-muted mx-4 my-2" />
          <Link href="/dashboard/admin">
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              Admin
            </div>
          </Link>
          <Link href="/dashboard/human-rights">
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
              <FileText className="h-4 w-4" />
              Human Rights
            </div>
          </Link>
          <Link href="/dashboard/fire">
            <div className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
              <Settings className="h-4 w-4" />
              Fire Dept
            </div>
          </Link>
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4 mr-3" />
            Logout Session
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}