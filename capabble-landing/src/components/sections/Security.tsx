"use client";

import React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { ShieldCheck, Lock, Users, Terminal } from "lucide-react";

export const Security: React.FC = () => {
    const securityFeatures = [
        {
            icon: <Lock />,
            title: "Token-based Auth",
            desc: "Secure access and refresh token flow for session management."
        },
        {
            icon: <Users />,
            title: "Role-Based Access",
            desc: "Granular controls for operational responsibilities and data access."
        },
        {
            icon: <Terminal />,
            title: "Security Middleware",
            desc: "CORS controls, request limiting, and header protections."
        },
    ];

    return (
        <Section id="security" className="relative overflow-hidden">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div className="order-2 lg:order-1 relative h-[500px] flex items-center justify-center">
                        <div className="relative w-full max-w-[450px] aspect-square group">
                            <div className="absolute inset-0 bg-brand-600/20 rounded-full blur-[100px] group-hover:bg-brand-600/30 transition-colors duration-700" />
                            <Image
                                src="/security-illustration.png"
                                alt="Security and Trust Illustration"
                                fill
                                className="object-contain relative z-10 animate-float"
                            />
                        </div>
                    </div>

                    <div className="order-1 lg:order-2 space-y-12">
                        <SectionTitle
                            alignment="left"
                            badge="Security First"
                            title="Trust, Security, and Reliability"
                            subtitle="Capabble includes core security and operational safeguards needed for high-stakes examination workflows."
                            className="mb-0"
                        />

                        <div className="space-y-8">
                            {securityFeatures.map((f, i) => (
                                <div key={i} className="flex items-start space-x-6 group">
                                    <div className="mt-1 p-3 rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                        {React.cloneElement(f.icon as React.ReactElement<{ className?: string }>, { className: "w-6 h-6" })}
                                    </div>
                                    <div className="space-y-2">
                                        <Typography variant="h4" as="h4" className="text-xl font-bold text-brand-950 dark:text-white">{f.title}</Typography>
                                        <Typography className="text-base font-medium opacity-70">{f.desc}</Typography>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-400 text-white shadow-2xl relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                            
                            <div className="flex items-center space-x-3 mb-4 relative z-10">
                                <ShieldCheck className="w-6 h-6" />
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Operational Integrity</span>
                            </div>
                            <Typography className="text-lg font-bold italic relative z-10 opacity-90 leading-relaxed">
                                "Built for institutions where data integrity and operational uptime are non-negotiable mission requirements."
                            </Typography>
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
