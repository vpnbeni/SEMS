"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, LayoutDashboard, Upload, Users, Calendar, FileText, ClipboardList, BookOpen, ExternalLink } from "lucide-react";

const capabilities = [
    { icon: <Upload className="w-5 h-5" />, text: "Import and manage CBSE datesheet data" },
    { icon: <Users className="w-5 h-5" />, text: "Import and maintain candidate records" },
    { icon: <Calendar className="w-5 h-5" />, text: "Generate centre-specific datesheets" },
    { icon: <FileText className="w-5 h-5" />, text: "Process Form 66 records by date and subject" },
    { icon: <LayoutDashboard className="w-5 h-5" />, text: "Multiple printable seating plan PDF formats" },
    { icon: <ClipboardList className="w-5 h-5" />, text: "Track answer-sheet inventory lifecycle" },
    { icon: <CheckCircle2 className="w-5 h-5" />, text: "Assign daily duties to exam functionaries" },
    { icon: <BookOpen className="w-5 h-5" />, text: "Access guidelines and circulars centrally" },
];

export const Solution: React.FC = () => {
    return (
        <Section id="solution" className="relative">
            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div className="space-y-10">
                        <SectionTitle
                            alignment="left"
                            badge="The Solution"
                            title="One Unified Exam Operations System"
                            subtitle="Capabble is a unified examination operations platform. It combines planning, execution, and tracking in one connected workflow."
                            className="mb-0"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-10">
                            {capabilities.map((item, index) => (
                                <div key={index} className="flex items-start space-x-4 group">
                                    <div className="mt-1 p-2 rounded-xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 group-hover:bg-brand-600 group-hover:text-white transition-all duration-300">
                                        {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" })}
                                    </div>
                                    <Typography className="text-base font-bold text-brand-950/80 dark:text-white/80 leading-snug">
                                        {item.text}
                                    </Typography>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4">
                            <Button variant="outline" className="group border-brand-200 dark:border-brand-800 rounded-xl px-8">
                                Explore the Dashboard
                                <ExternalLink className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>

                    <div className="relative lg:h-[600px] flex items-center">
                        {/* Dashboard Mock Representation */}
                        <div className="relative w-full glass rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-white/20 dark:border-brand-800/50">
                            <div className="h-14 bg-white/50 dark:bg-brand-950/50 border-b border-brand-100 dark:border-brand-800 flex items-center px-6 justify-between">
                                <div className="flex space-x-2">
                                    <div className="w-3.5 h-3.5 rounded-full bg-red-400/80" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-yellow-400/80" />
                                    <div className="w-3.5 h-3.5 rounded-full bg-green-400/80" />
                                </div>
                                <div className="h-8 w-64 bg-brand-50/50 dark:bg-brand-900/50 rounded-lg flex items-center px-4">
                                    <div className="h-1.5 w-full bg-brand-200 dark:bg-brand-800 rounded-full" />
                                </div>
                                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-800" />
                            </div>
                            <div className="p-10 space-y-8 bg-white/30 dark:bg-brand-950/30">
                                <div className="grid grid-cols-3 gap-8">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-32 bg-white dark:bg-brand-900 rounded-2xl shadow-sm border border-brand-100 dark:border-brand-800 p-4 space-y-3">
                                            <div className="h-3 w-12 bg-brand-100 dark:bg-brand-800 rounded" />
                                            <div className="h-8 w-20 bg-brand-50 dark:bg-brand-950 rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="h-72 bg-white dark:bg-brand-900 rounded-2xl shadow-sm border border-brand-100 dark:border-brand-800 flex flex-col items-center justify-center p-8 space-y-4">
                                    <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-950 flex items-center justify-center">
                                        <LayoutDashboard className="w-10 h-10 text-brand-200 dark:text-brand-800" />
                                    </div>
                                    <Typography className="text-sm font-bold opacity-30 uppercase tracking-widest">Analytics Interface</Typography>
                                </div>
                            </div>
                        </div>

                        {/* Floating stats card */}
                        <div className="absolute -bottom-10 -left-10 glass p-8 rounded-3xl shadow-2xl md:block hidden animate-float border-white/40 dark:border-brand-800">
                            <div className="flex items-center space-x-5">
                                <div className="p-4 bg-success/10 rounded-2xl">
                                    <CheckCircle2 className="w-8 h-8 text-success" />
                                </div>
                                <div>
                                    <Typography className="text-lg font-black text-brand-950 dark:text-white leading-tight">100% Alignment</Typography>
                                    <Typography className="text-sm font-bold opacity-60">CBSE Operations</Typography>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
