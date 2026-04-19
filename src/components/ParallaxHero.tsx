"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function ParallaxHero() {
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        let ticking = false;

        const onScroll = () => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const nextY = clamp(window.scrollY, 0, 1200);
                setScrollY(nextY);
                ticking = false;
            });
        };

        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const styles = useMemo(
        () => ({
            orbA: { transform: `translate3d(0, ${scrollY * 0.16}px, 0)` },
            orbB: { transform: `translate3d(0, ${scrollY * -0.1}px, 0)` },
            orbC: { transform: `translate3d(0, ${scrollY * 0.08}px, 0)` },
            content: { transform: `translate3d(0, ${scrollY * 0.06}px, 0)` },
            glitter: { transform: `translate3d(0, ${scrollY * 0.22}px, 0)` },
        }),
        [scrollY]
    );

    return (
        <section className="relative min-h-[100svh] w-full overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,hsl(var(--primary)/0.2),transparent_45%),radial-gradient(circle_at_86%_22%,hsl(var(--secondary)/0.17),transparent_40%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]" />

            <div className="pointer-events-none absolute inset-0">
                <div style={styles.orbA} className="hero-orb hero-orb-a" />
                <div style={styles.orbB} className="hero-orb hero-orb-b" />
                <div style={styles.orbC} className="hero-orb hero-orb-c" />
                <div style={styles.glitter} className="hero-glitter-layer" />
            </div>

            <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pt-24 pb-16 md:px-10">
                <div style={styles.content} className="space-y-7 max-w-3xl">
                    <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Private. Elegant. Human.
                    </p>

                    <h1 className="text-5xl font-headline font-extrabold leading-[1.05] tracking-tight text-foreground md:text-7xl">
                        Every Voice Matters.
                        <span className="block text-primary">No One Stands Alone.</span>
                    </h1>

                    <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                        Anonymous Reporting gives people a trusted space to speak up. Anywhere, anyone can report with confidence, protected by privacy, dignity, and care.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        <Link href="/dashboard/admin">
                            <Button className="h-11 gap-2 px-5">
                                Open Mission Console
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/dashboard/human-rights">
                            <Button variant="outline" className="h-11 gap-2 px-5">
                                <Lock className="h-4 w-4" />
                                View Safe Reporting Desks
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-16 inline-flex w-fit items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-xs uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-sm">
                    Scroll to explore our mission
                </div>
            </div>
        </section>
    );
}
