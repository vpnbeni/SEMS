"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import {
    BarChart3,
    Users2,
    FileCheck,
    Grid3X3,
    Archive,
    UserPlus,
    HelpCircle,
    LucideIcon
} from "lucide-react";

interface Feature {
    icon: LucideIcon;
    title: string;
    description: string;
    impact: string;
}

const features: Feature[] = [
    {
        icon: BarChart3,
        title: "Datesheet Intelligence",
        description: "Capabble imports board datesheet PDFs, structures exam entries, and supports full and centre-specific views.",
        impact: "Your team works from standardized exam records instead of manually retyping schedules.",
    },
    {
        icon: Users2,
        title: "Candidate Operations",
        description: "Supports candidate import and management with class-aware filtering and candidate-level details.",
        impact: "Clean candidate data is the foundation for accurate seating and exam-day planning.",
    },
    {
        icon: FileCheck,
        title: "Form 66 Handling",
        description: "Capabble processes Form 66 records and organizes them by date and subject for operational use.",
        impact: "Attendance-linked records improve decision-making for room utilization and execution.",
    },
    {
        icon: Grid3X3,
        title: "Seating Plan PDFs",
        description: "Generates downloadable seating documents across multiple required print formats (Main Gate, Room slips).",
        impact: "Coordinators can issue room-ready and gate-ready outputs without building layouts manually.",
    },
    {
        icon: Archive,
        title: "Answer-Sheet Inventory",
        description: "Tracks answer sheets through received, used, discarded, and balance states, including type and serial logic.",
        impact: "You get clearer control over exam stationery movement and usage accountability.",
    },
    {
        icon: UserPlus,
        title: "Duties and Room Mapping",
        description: "Supports room setup and date-wise functionary duty assignment for predictable execution.",
        impact: "Daily execution becomes more predictable with defined room-to-functionary mapping.",
    },
    {
        icon: HelpCircle,
        title: "Guidelines and Portals",
        description: "Centralized access to centre guidelines, CBSE circulars, and quick links to official board portals.",
        impact: "Teams can align operational decisions with current board instructions from one interface.",
    },
];

export const Features: React.FC = () => {
    return (
        <Section id="features" className="bg-brand-50/50 dark:bg-brand-950/20 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-brand-100),transparent_70%)] opacity-30 dark:opacity-10 -z-10" />

            <Container>
                <SectionTitle
                    badge="Capabilities"
                    title="Factual Capability and Control"
                    subtitle="Capabble includes the specific modules needed for school and centre-level exam coordination."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="glass p-10 rounded-[2.5rem] hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] transition-all duration-500 group border-white/40 dark:border-brand-800/50 hover:-translate-y-2"
                        >
                            <div className="flex flex-col space-y-6">
                                <div className="p-4 rounded-2xl bg-brand-600 text-white w-fit shadow-lg shadow-brand-600/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    <feature.icon className="w-8 h-8" />
                                </div>
                                
                                <div className="space-y-4">
                                    <Typography variant="h4" as="h4" className="text-2xl text-brand-950 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        {feature.title}
                                    </Typography>
                                    <Typography className="text-base font-medium opacity-70 leading-relaxed min-h-[80px]">
                                        {feature.description}
                                    </Typography>
                                </div>

                                <div className="pt-8 border-t border-brand-100 dark:border-brand-800 space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-brand-600" />
                                        <Typography className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                                            Operational ROI
                                        </Typography>
                                    </div>
                                    <Typography className="text-sm font-bold text-brand-950 dark:text-white italic leading-snug">
                                        "{feature.impact}"
                                    </Typography>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
        </Section>
    );
};

