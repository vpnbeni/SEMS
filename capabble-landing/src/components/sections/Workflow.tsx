"use client";

import React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

const steps = [
    {
        title: "CBSE Datesheet Import",
        description: "Upload official datesheet PDFs and convert them into structured, usable exam records.",
        value: "Reduces manual timetable entry and standardizes exam-day data.",
    },
    {
        title: "Candidate Import and Management",
        description: "Import candidate lists and manage class-wise candidate records with searchable views.",
        value: "Keeps candidate data accurate and ready for downstream planning.",
    },
    {
        title: "Centre-Specific Datesheet",
        description: "Generate centre-focused exam views that reflect only relevant candidates and subjects.",
        value: "Prevents confusion caused by full-board schedules.",
    },
    {
        title: "Form 66 Processing",
        description: "Upload and process Form 66 files, grouped by exam date and subject.",
        value: "Improves exam-day readiness using attendance-linked records.",
    },
    {
        title: "Seating Plan Generation",
        description: "Generate downloadable seating plan PDFs in multiple formats such as Main Gate and Room slips.",
        value: "Produces print-ready outputs for fast room-level execution.",
    },
    {
        title: "Answer-Sheet Inventory Tracking",
        description: "Track stock from receipt to usage/discarding with class and type context.",
        value: "Increases accountability and reduces inventory mismatches.",
    },
    {
        title: "Duty Assignment",
        description: "Assign exam functionaries to active rooms for specific exam dates.",
        value: "Ensures room-wise operational coverage with less manual effort.",
    },
];

export const Workflow: React.FC = () => {
    return (
        <Section id="workflow" className="relative overflow-hidden">
            {/* Background patterns */}
            <div className="absolute top-0 right-0 w-full h-full -z-10 pointer-events-none opacity-20">
                <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-brand-600/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-[20%] left-[10%] w-96 h-96 bg-brand-400/10 blur-[100px] rounded-full" />
            </div>

            <Container>
                <SectionTitle
                    badge="The Process"
                    title="End-to-End Operational Workflow"
                    subtitle="A structured path from official board inputs to final exam-day execution."
                />

                <div className="relative mt-32">
                    {/* Vertical line for desktop */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-600/0 via-brand-600/20 to-brand-600/0 hidden md:block -translate-x-1/2" />

                    <div className="space-y-32 md:space-y-48">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className={`relative flex flex-col md:flex-row items-center ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}
                            >
                                {/* Visual Circle Indicator */}
                                <div className="absolute left-1/2 -translate-x-1/2 top-0 md:top-1/2 md:-translate-y-1/2 w-14 h-14 rounded-2xl bg-white dark:bg-brand-950 border-2 border-brand-600 shadow-[0_0_20px_rgba(79,70,229,0.2)] z-10 hidden md:flex items-center justify-center font-black text-xl text-brand-600 transition-transform hover:scale-110 hover:rotate-6">
                                    {index + 1}
                                </div>

                                {/* Content Area */}
                                <div className="w-full md:w-1/2 px-10 py-6">
                                    <div className={`glass p-10 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border-white/20 dark:border-brand-800/50 group ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                                        <Typography variant="h3" as="h3" className="mb-6 text-brand-950 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                            {step.title}
                                        </Typography>
                                        <Typography className="mb-8 text-lg font-medium opacity-70 leading-relaxed">
                                            {step.description}
                                        </Typography>
                                        <div className={`inline-block px-6 py-3 rounded-2xl bg-brand-50/50 dark:bg-brand-900/30 border border-brand-100 dark:border-brand-800`}>
                                            <Typography className="text-xs font-black uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400 mb-2">Operational Impact</Typography>
                                            <Typography className="text-base font-bold text-brand-950 dark:text-white">{step.value}</Typography>
                                        </div>
                                    </div>
                                </div>

                                {/* Illustration Space */}
                                <div className="w-full md:w-1/2 px-10 flex justify-center">
                                    <div className="relative w-full max-w-[350px] aspect-square flex items-center justify-center transition-all duration-700 hover:scale-110 group">
                                        <div className="absolute inset-0 bg-brand-600/5 rounded-full blur-3xl group-hover:bg-brand-600/10 transition-colors" />
                                        <Image
                                            src="/workflow-illustration.png"
                                            alt={step.title}
                                            fill
                                            className="object-contain dark:invert opacity-60 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="mt-48 p-16 md:p-24 bg-brand-600 dark:bg-brand-500 rounded-[3rem] text-center shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] overflow-hidden relative group">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-64 -mt-64 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-black/10 rounded-full -ml-48 -mb-48" />

                    <div className="relative z-10 space-y-10">
                        <Typography variant="h2" as="h2" className="text-white">
                            Ready to see this workflow in action?
                        </Typography>
                        <Typography className="text-brand-100 font-medium text-xl md:text-2xl max-w-3xl mx-auto opacity-90">
                            Stop fighting with spreadsheets. Move your entire exam centre operation into one reliable dashboard.
                        </Typography>
                        <div className="flex justify-center pt-6">
                            <Button
                                size="lg"
                                className="px-12 py-6 text-xl bg-white text-brand-600 hover:bg-brand-50 border-none shadow-2xl active:scale-95 transition-all"
                                onClick={() => toast.success("Scheduling a custom walkthrough for your institution...")}
                            >
                                Request Custom Walkthrough
                            </Button>
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};
