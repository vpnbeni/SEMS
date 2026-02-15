"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { AlertCircle, FileX, Clock, MapPin, Search, ShieldAlert, ArrowRight } from "lucide-react";

const painPoints = [
    {
        icon: <FileX className="w-6 h-6 text-red-500" />,
        title: "Fragmented Records",
        description: "Data split across paper registers, multiple spreadsheets, and disconnected files.",
    },
    {
        icon: <Clock className="w-6 h-6 text-red-500" />,
        title: "Delayed Coordination",
        description: "Last-minute updates via WhatsApp create high-risk points in the exam timetable.",
    },
    {
        icon: <MapPin className="w-6 h-6 text-red-500" />,
        title: "Seating Inaccuracies",
        description: "Manual room allocation errors caused by disconnected candidate and subject data.",
    },
    {
        icon: <Search className="w-6 h-6 text-red-500" />,
        title: "Weak Tracking",
        description: "Low accountability for received, used, discarded, and balance answer sheets.",
    },
    {
        icon: <ShieldAlert className="w-6 h-6 text-red-500" />,
        title: "Compliance Stress",
        description: "Guidelines and circulars are not centrally available, leading to last-minute panic.",
    },
];

export const Problem: React.FC = () => {
    return (
        <Section id="problem" className="bg-brand-50/30 dark:bg-brand-950/20 relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-error/5 blur-[100px] rounded-full -z-10" />

            <Container>
                <SectionTitle
                    badge="The Challenge"
                    title="The Reality of Operational Chaos"
                    subtitle="Traditional exam management is often split across paper registers and disconnected spreadsheets, leading to avoidable risks."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {painPoints.map((point, index) => (
                        <div
                            key={index}
                            className="glass p-10 rounded-[2rem] hover:shadow-xl transition-all duration-500 group border-transparent hover:border-error/20"
                        >
                            <div className="mb-8 p-4 rounded-2xl bg-error/10 dark:bg-error/5 w-fit group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                {React.cloneElement(point.icon as React.ReactElement<{ className?: string }>, { className: "w-8 h-8 text-error" })}
                            </div>
                            <Typography variant="h4" as="h4" className="mb-4 text-brand-950 dark:text-white">
                                {point.title}
                            </Typography>
                            <Typography className="text-base font-medium opacity-70 leading-relaxed">
                                {point.description}
                            </Typography>
                        </div>
                    ))}

                    {/* Solution Teaser Card */}
                    <div className="bg-brand-600 dark:bg-brand-500 p-10 rounded-[2rem] shadow-2xl flex flex-col justify-between relative overflow-hidden group cursor-pointer" onClick={() => document.getElementById('solution')?.scrollIntoView({ behavior: 'smooth' })}>
                        {/* Decorative circle */}
                        <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        
                        <div className="space-y-4 relative z-10">
                            <Typography variant="h3" as="h3" className="text-white">
                                There is a more Capabble way.
                            </Typography>
                            <Typography className="text-brand-100 font-medium text-lg">
                                Capabble addresses these operational gaps by giving examination teams one structured system.
                            </Typography>
                        </div>
                        
                        <div className="flex items-center text-white font-bold text-lg mt-8 relative z-10 group-hover:translate-x-2 transition-transform">
                            See the solution
                            <ArrowRight className="ml-3 w-6 h-6" />
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
