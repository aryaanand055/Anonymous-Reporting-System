import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Shield, Users, Flame, ArrowRight, Radar, Globe, HeartHandshake, Check, Lock } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ParallaxHero } from "@/components/ParallaxHero";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <header className="border-b bg-background/70 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary w-8 h-8 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">ANONYMOUS REPORTING</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/admin">
              <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2">
                Open Dashboard
              </Button>
            </Link>
            <Link href="/track">
              <Button size="sm" variant="outline">
                Track Status
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <ParallaxHero />

        <section className="container mx-auto px-4 py-14 md:py-20">
          <ScrollReveal>
            <div className="mx-auto max-w-6xl grid gap-5 md:grid-cols-3">
              {["Anywhere", "Anyone", "Anytime"].map((item) => (
                <div key={item} className="rounded-2xl border bg-card/80 p-6 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Core Promise</p>
                  <h3 className="mt-3 text-2xl font-headline font-bold text-primary">{item}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    We remove fear and friction so every concern can be voiced safely and respectfully.
                  </p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <ScrollReveal delayMs={80}>
          <section className="container mx-auto px-4 py-6 md:py-10 grid md:grid-cols-3 gap-5">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  What We Do
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We provide a universal anonymous reporting space where people can safely speak up from anywhere.
                </p>
              </CardContent>
            </Card>
            <Card className="border-secondary/30 bg-secondary/5">
              <CardHeader>
                <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-secondary" />
                  Privacy First
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reports are handled with strict anonymity and offline-first privacy principles to protect identities.
                </p>
              </CardContent>
            </Card>
            <Card className="border-accent/30 bg-accent/5">
              <CardHeader>
                <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4 text-accent" />
                  Why It Matters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  When voices are safe, communities become stronger, more just, and more responsive.
                </p>
              </CardContent>
            </Card>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={100}>
          <section className="container mx-auto px-4 py-6 md:py-10">
            <div className="mx-auto max-w-6xl rounded-3xl border bg-card/70 p-8 md:p-10 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Our Commitment</p>
              <h3 className="mt-3 text-3xl md:text-4xl font-headline font-bold">Trust Is The Product</h3>
              <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
                We are built for confidence. Every interaction is designed to preserve safety, respect identities, and create a calm path to accountability.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  "Anonymous by default",
                  "Offline-first privacy posture",
                  "Sensitive-first language and UX",
                  "Clarity for decision makers",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-xl border bg-background/70 p-4">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-sm text-foreground/90">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <div className="container mx-auto px-4 py-6 md:py-10 grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </ScrollReveal>

        <ScrollReveal delayMs={160}>
          <section className="container mx-auto px-4 py-10 md:py-14">
            <div className="rounded-2xl border bg-card/80 backdrop-blur-sm p-8 md:p-10 text-center space-y-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Radar className="h-3.5 w-3.5" />
                Mission Statement
              </p>
              <h3 className="text-2xl md:text-3xl font-headline font-bold">Give Every Person a Safe Way to Be Heard</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Anonymous Reporting exists so no one has to choose between silence and safety. We protect privacy, elevate voices, and support accountable action.
              </p>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} SentinelFlow. Professional Incident Response Infrastructure.
        </div>
      </footer>
    </div>
  );
}