"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
    children: React.ReactNode;
    className?: string;
    delayMs?: number;
}

export function ScrollReveal({ children, className, delayMs = 0 }: ScrollRevealProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const target = containerRef.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ transitionDelay: `${delayMs}ms` }}
            className={cn("reveal-on-scroll", isVisible && "revealed", className)}
        >
            {children}
        </div>
    );
}
