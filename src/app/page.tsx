import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Shield, Users, Flame, Plus, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">ANONYMOUS REPORTING</h1>
          </div>
          <Link href="/submit">
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="h-4 w-4" />
              Submit Report
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-24">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-foreground tracking-tight">
              Your Safety, <span className="text-primary">Our Priority.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A secure, anonymous reporting platform created by <span className="text-foreground font-bold italic underline decoration-primary/30">Arya</span>. Report incidents with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/dashboard/admin">
              <Card className="h-full border-t-4 border-t-primary hover:shadow-lg transition-all group">
                <CardHeader>
                  <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Shield className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-headline">Admin Control</CardTitle>
                  <CardDescription>Comprehensive view of all departmental reports and statuses.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm font-medium text-primary gap-1">
                    Enter Dashboard <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/human-rights">
              <Card className="h-full border-t-4 border-t-secondary hover:shadow-lg transition-all group">
                <CardHeader>
                  <div className="bg-secondary/10 w-10 h-10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-headline">Human Rights</CardTitle>
                  <CardDescription>Monitor and resolve civil rights incident reports in real-time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm font-medium text-secondary gap-1">
                    Enter Dashboard <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/fire">
              <Card className="h-full border-t-4 border-t-accent hover:shadow-lg transition-all group">
                <CardHeader>
                  <div className="bg-accent/10 w-10 h-10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                    <Flame className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-xl font-headline">Fire Department</CardTitle>
                  <CardDescription>Direct interface for fire and emergency response management.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm font-medium text-accent gap-1">
                    Enter Dashboard <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="flex flex-col items-center gap-6 pt-12">
            <Link href="/submit">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg px-12 py-6 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-200">
                Start Report Submission
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground font-medium">
              Information is processed instantly and routed to the correct department.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} SentinelFlow. Professional Incident Response Infrastructure.
        </div>
      </footer>
    </div>
  );
}