"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRight, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

import { Button } from "@/components/ui/button";

export function ParallaxHero() {
    const containerRef = useRef<HTMLElement | null>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end start"],
    });

    const textY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
    const orbsY = useTransform(scrollYProgress, [0, 1], ["0%", "44%"]);
    const panelY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
    const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    return (
        <section ref={containerRef} className="relative min-h-[100svh] overflow-hidden privacy-grid-bg">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,hsl(var(--primary)/0.24),transparent_40%),radial-gradient(circle_at_84%_20%,hsl(var(--secondary)/0.2),transparent_38%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background)))]" />
            <div className="aurora-sweep absolute inset-x-0 top-0 h-44" />

            <motion.div style={{ y: orbsY, opacity: fade }} className="pointer-events-none absolute inset-0">
                <motion.div
                    animate={{ y: [0, -18, 0], scale: [1, 1.06, 1], opacity: [0.55, 0.8, 0.55] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="hero-orb hero-orb-a"
                />
                <motion.div
                    animate={{ y: [0, 26, 0], scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
                    transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="hero-orb hero-orb-b"
                />
                <motion.div
                    animate={{ y: [0, -12, 0], x: [0, 16, 0], opacity: [0.35, 0.55, 0.35] }}
                    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="hero-orb hero-orb-c"
                />
                <div className="hero-glitter-layer" />
            </motion.div>

            <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-center px-6 pb-16 pt-24 md:px-10">
                <motion.div style={{ y: textY, opacity: fade }} className="max-w-3xl space-y-7">
                    <motion.p
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                        className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary backdrop-blur-md"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Private. Refined. Human.
                    </motion.p>

                    <h1 className="text-5xl font-headline font-extrabold leading-[1.03] tracking-tight text-foreground md:text-7xl">
                        <motion.span
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.08 }}
                            className="block"
                        >
                            Speak Without Fear.
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: 0.16 }}
                            className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                        >
                            Be Heard With Dignity.
                        </motion.span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.24 }}
                        className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl"
                    >
                        A modern civic trust platform where anyone can report concerns anonymously. Designed for calm clarity, strict privacy, and responsive action.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.32 }}
                        className="flex flex-wrap gap-4"
                    >
                        <Link href="/dashboard/admin">
                            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                                <Button className="h-12 gap-2 rounded-full px-6 shadow-[0_0_20px_hsl(var(--primary)/0.28)] transition-shadow hover:shadow-[0_0_30px_hsl(var(--primary)/0.45)]">
                                    Open Mission Console
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        </Link>

                        <Link href="/dashboard/human-rights">
                            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                                <Button variant="outline" className="h-12 gap-2 rounded-full border-primary/30 bg-background/50 px-6 backdrop-blur-md hover:bg-primary/10">
                                    <Lock className="h-4 w-4" />
                                    Privacy-First Desks
                                </Button>
                            </motion.div>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.45 }}
                        className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3"
                    >
                        {[
                            { label: "Identity Shielded", value: "100%" },
                            { label: "Access Model", value: "Need-To-Know" },
                            { label: "Trust Signal", value: "Verified Routing" },
                        ].map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.52 + index * 0.08 }}
                                className="glass-noise rounded-2xl border border-primary/20 bg-card/30 px-5 py-4 backdrop-blur-md transition-colors hover:bg-card/50"
                            >
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{item.value}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>

                <motion.div
                    style={{ y: panelY }}
                    initial={{ opacity: 0, x: 44 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7, delay: 0.5, type: "spring" }}
                    className="pointer-events-none absolute right-8 top-32 hidden w-80 rounded-3xl border border-primary/30 bg-card/40 p-6 shadow-2xl backdrop-blur-xl lg:block"
                >
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent" />
                    <div className="relative z-10">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-primary shadow-inner">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Privacy Envelope
                        </div>
                        <p className="mt-3 text-sm leading-relaxed font-medium text-foreground/80">
                            Reports are surfaced with care and discretion, allowing decision makers to act while preserving human safety.
                        </p>
                        <div className="mt-5 h-2 w-full overflow-hidden rounded-full border border-primary/20 bg-primary/10">
                            <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary"
                                initial={{ width: "0%" }}
                                animate={{ width: "66%" }}
                                transition={{ duration: 1.4, delay: 0.95, ease: "easeOut" }}
                            >
                                <div className="shimmer-line h-full w-full opacity-50" />
                            </motion.div>
                        </div>
                        <p className="mt-4 text-right text-[10px] font-medium uppercase tracking-widest text-primary/80">
                            Securing payload
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}