"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { Layers, ShieldCheck, Mail, Database, Zap } from "lucide-react";

const points = [
    {
        icon: <Database className="w-6 h-6" />,
        title: "Database-per-Tenant",
        text: "Each institution gets an isolated database ensuring complete data separation and privacy.",
    },
    {
        icon: <Layers className="w-6 h-6" />,
        title: "Platform Layer",
        text: "Centralized admin controls for tenant provisioning, monitoring, and configuration.",
    },
    {
        icon: <ShieldCheck className="w-6 h-6" />,
        title: "Tenant Resolution",
        text: "Automatic tenant identification via subdomain or header for seamless routing.",
    },
    {
        icon: <Mail className="w-6 h-6" />,
        title: "Self-Service Onboarding",
        text: "Ticket-based signup with OTP verification for quick institutional onboarding.",
    },
];

export const MultiTenant: React.FC = () => {
    return (
        <Section id="multi-tenant" className="overflow-hidden bg-brand-950 text-white relative">
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,var(--color-brand-900),transparent_50%)] opacity-50 -z-10" />
            
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <div className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] bg-brand-900/50 text-brand-400 border border-brand-800">
                                Architecture & Scalability
                            </div>
                            <Typography variant="h2" as="h2" className="text-white">
                                Institutional Independence, <span className="text-brand-400">Centralized Control.</span>
                            </Typography>
                            <Typography className="text-brand-100/70 text-xl font-medium leading-relaxed max-w-xl">
                                Capabble is designed with tenant-based architecture so each institution can operate in an isolated workspace while being managed from a centralized platform layer.
                            </Typography>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
                            {points.map((point, idx) => (
                                <div key={idx} className="group space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-brand-900 border border-brand-800 flex items-center justify-center text-brand-400 shadow-xl group-hover:bg-brand-600 group-hover:text-white group-hover:scale-110 transition-all duration-300">
                                        {React.cloneElement(point.icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
                                    </div>
                                    <div className="space-y-2">
                                        <Typography variant="h4" as="h4" className="text-lg text-white group-hover:text-brand-400 transition-colors">{point.title}</Typography>
                                        <Typography className="text-sm font-medium text-brand-100/50 leading-relaxed">{point.text}</Typography>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <div className="p-8 rounded-[2rem] bg-brand-900/50 border border-brand-800 backdrop-blur-sm shadow-2xl relative group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-600/10 rounded-full -mr-12 -mt-12 blur-xl" />
                                <Typography className="text-base font-bold italic text-brand-100 opacity-90 leading-relaxed">
                                    "Capabble gives education groups a practical way to manage multiple institutions while keeping each tenant operationally independent."
                                </Typography>
                            </div>
                        </div>
                    </div>

                    <div className="relative lg:h-[600px] flex items-center">
                        {/* Visual representation of multi-tenancy */}
                        <div className="relative w-full aspect-square max-w-[500px] mx-auto">
                            <div className="absolute inset-0 bg-brand-600/20 rounded-full blur-[120px] animate-pulse" />
                            
                            <div className="relative glass p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.3)] border-white/10 space-y-8 group hover:rotate-2 transition-transform duration-700">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-40 bg-brand-800 rounded-full" />
                                    <div className="w-10 h-10 rounded-full bg-brand-800/50 flex items-center justify-center">
                                        <Layers className="w-5 h-5 text-brand-600" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-6">
                                    {[1, 2, 3, 4].map(n => (
                                        <div key={n} className="h-32 rounded-3xl border border-brand-800/50 bg-brand-950/50 flex flex-col items-center justify-center space-y-4 group/item hover:bg-brand-900/50 transition-colors duration-300">
                                            <div className="p-3 rounded-xl bg-brand-900 border border-brand-800 text-brand-600 group-hover/item:scale-110 group-hover/item:rotate-6 transition-all">
                                                <ShieldCheck className="w-6 h-6" />
                                            </div>
                                            <div className="h-1.5 w-16 bg-brand-800 rounded-full" />
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="pt-4 flex justify-center">
                                    <div className="p-5 rounded-3xl bg-brand-600 shadow-[0_0_30px_rgba(79,70,229,0.5)] border border-white/20 animate-bounce">
                                        <Zap className="w-10 h-10 text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Floating Badge */}
                            <div className="absolute -top-6 -right-6 bg-brand-600 text-white px-6 py-3 rounded-2xl text-sm font-black tracking-widest uppercase shadow-[0_10px_30px_rgba(79,70,229,0.4)] rotate-12">
                                Platform Layer
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
