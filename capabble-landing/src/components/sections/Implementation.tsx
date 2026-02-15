"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { Cloud, Server, Database, FileCode } from "lucide-react";

const stack = [
    {
        icon: <Cloud className="w-8 h-8" />,
        label: "Cloud-Ready",
        desc: "Vercel + AWS compatible",
    },
    {
        icon: <Server className="w-8 h-8" />,
        label: "Node.js Backend",
        desc: "Express-based REST API",
    },
    {
        icon: <Database className="w-8 h-8" />,
        label: "MongoDB Atlas",
        desc: "Per-tenant database isolation",
    },
    {
        icon: <FileCode className="w-8 h-8" />,
        label: "React Frontend",
        desc: "TypeScript + Vite powered",
    },
];

export const Implementation: React.FC = () => {
    return (
        <Section id="implementation" className="bg-brand-50/50 dark:bg-brand-950/20 relative overflow-hidden">
            <Container>
                <SectionTitle
                    badge="Infrastructure"
                    title="Implementation and Deployment Readiness"
                    subtitle="Capabble is implementation-ready for institutions that need a practical deployment path."
                />

                <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stack.map((item, idx) => (
                        <div key={idx} className="glass p-10 rounded-[2.5rem] flex flex-col items-center text-center space-y-6 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border-white/40 dark:border-brand-800/50 group">
                            <div className="p-5 rounded-2xl bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 mb-2 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8" })}
                            </div>
                            <div className="space-y-2">
                                <Typography variant="h4" as="h4" className="text-xl font-black text-brand-950 dark:text-white">{item.label}</Typography>
                                <Typography className="text-sm opacity-60 leading-relaxed font-bold uppercase tracking-widest">{item.desc}</Typography>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-24 max-w-5xl mx-auto p-1 bg-gradient-to-r from-transparent via-brand-600/20 to-transparent rounded-[3rem]">
                    <div className="glass p-12 rounded-[2.8rem] text-center border-white/40 dark:border-brand-800/50 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-brand-600/5 group-hover:bg-brand-600/10 transition-colors duration-700" />
                        <Typography className="text-2xl font-bold italic text-brand-950 dark:text-white opacity-80 relative z-10 leading-relaxed max-w-3xl mx-auto">
                            "Capabble can be deployed as a modern cloud setup without forcing schools into rigid infrastructure choices."
                        </Typography>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
