import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Shield,
  Users,
  Flame,
  ArrowRight,
  Radar,
  Globe,
  HeartHandshake,
  Check,
  Lock,
  EyeOff,
  Fingerprint,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ParallaxHero } from "@/components/ParallaxHero";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]">
      <header className="border-b bg-background/70 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
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
            <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-3">
              {[
                { title: "Anywhere", desc: "From neighborhoods to institutions, concerns can be shared without gatekeeping." },
                { title: "Anyone", desc: "Every person can report safely, regardless of role, background, or influence." },
                { title: "Anytime", desc: "Critical issues should not wait. The platform remains continuously accessible." },
              ].map((item) => (
                <div
                  key={item.title}
                  className="tilt-on-hover rounded-2xl border bg-card/85 p-6 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Core Promise</p>
                  <h3 className="mt-3 text-2xl font-headline font-bold text-primary">{item.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        <ScrollReveal delayMs={80}>
          <section className="px-4 py-6 md:py-10">
            <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-3">
              <Card className="border-primary/30 bg-primary/5 shadow-md shadow-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Inclusive Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    A universal anonymous reporting experience built so people can speak up safely from wherever they are.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-secondary/30 bg-secondary/5 shadow-md shadow-secondary/5">
                <CardHeader>
                  <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                    <Lock className="h-4 w-4 text-secondary" />
                    Private By Default
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Identity-aware safeguards are embedded in the experience to minimize exposure and protect human dignity.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-accent/30 bg-accent/5 shadow-md shadow-accent/5">
                <CardHeader>
                  <CardTitle className="text-lg font-headline inline-flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-accent" />
                    Trust Through Care
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sensitive experiences require calm interfaces and responsible routing so communities can respond with confidence.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={100}>
          <section className="px-4 py-6 md:py-10">
            <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border bg-card/70 p-8 backdrop-blur-sm md:p-10">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Our Commitment</p>
              <h3 className="mt-3 text-3xl md:text-4xl font-headline font-bold">Privacy Is Our Product Experience</h3>
              <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">
                Every interaction is shaped to protect safety, reduce anxiety, and preserve anonymity while enabling clear operational response.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {[
                  "Anonymous by default",
                  "Minimal exposure architecture",
                  "Trauma-aware language patterns",
                  "Clear status visibility for trust",
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

        <ScrollReveal delayMs={110}>
          <section className="px-4 py-6 md:py-10">
            <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2">
              <div className="rounded-2xl border bg-card/80 p-7 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Privacy Signals</p>
                <h3 className="mt-2 text-2xl font-headline font-bold">Built For Discretion</h3>
                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Fingerprint className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Identity details are intentionally minimized across reporting interactions.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <EyeOff className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Interfaces are designed to reduce visibility risk in shared or public contexts.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Operational teams get what they need to act, without unnecessary personal exposure.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card/80 p-7 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status Transparency</p>
                <h3 className="mt-2 text-2xl font-headline font-bold">Confidence Through Visibility</h3>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  A report should never disappear into silence. Tracking and update states keep people informed and reassured without compromising privacy.
                </p>
                <div className="mt-5 rounded-xl border bg-background/70 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Tracking Flow</span>
                    <span>Live</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="shimmer-line h-full w-3/4 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal delayMs={120}>
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-3 md:py-10">
            <Link href="/dashboard/admin">
              <Card className="h-full border-t-4 border-t-primary hover:shadow-xl transition-all duration-300 group">
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
              <Card className="h-full border-t-4 border-t-secondary hover:shadow-xl transition-all duration-300 group">
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
              <Card className="h-full border-t-4 border-t-accent hover:shadow-xl transition-all duration-300 group">
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
          <section className="px-4 py-10 md:py-14">
            <div className="mx-auto w-full max-w-6xl space-y-4 rounded-2xl border bg-card/80 p-8 text-center backdrop-blur-sm md:p-10">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Radar className="h-3.5 w-3.5" />
                Mission Statement
              </p>
              <h3 className="text-2xl md:text-3xl font-headline font-bold">A Safer Way To Speak, A Smarter Way To Respond</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Anonymous Reporting exists so people never have to choose between silence and safety. We prioritize privacy, preserve dignity, and enable meaningful action.
              </p>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <footer className="border-t py-8 mt-12">
        <div className="mx-auto w-full max-w-6xl px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} SentinelFlow. Professional Incident Response Infrastructure.
        </div>
      </footer>
    </div>
  );
}