"use client";

import React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";
import { ChevronRight, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";

export const Hero: React.FC = () => {
    const handleDemoClick = () => {
        toast.success("Request Demo initiated. We will contact you shortly.");
    };

    return (
        <div className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
            {/* Background patterns */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-brand-200/40 dark:bg-brand-900/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[5%] left-[-5%] w-[50%] h-[50%] bg-brand-100/30 dark:bg-brand-800/10 rounded-full blur-[100px]" />
                <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-accent-light/10 dark:bg-accent-dark/5 rounded-full blur-[80px]" />
            </div>

            <Container>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="lg:col-span-7 space-y-10"
                    >
                        <div className="inline-flex items-center px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-bold border border-brand-200 dark:border-brand-800 shadow-sm">
                            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-600 mr-3 animate-ping" />
                            Revolutionizing Exam Operations
                        </div>

                        <div className="space-y-6">
                            <Typography as="h1" className="text-brand-950 dark:text-white">
                                Bringing Exam Operations Into <span className="text-brand-600 dark:text-brand-400">One Reliable Workflow.</span>
                            </Typography>
                            <Typography className="text-xl md:text-2xl font-medium opacity-80 leading-relaxed max-w-2xl">
                                From CBSE datesheet imports to automated seating plans and secure answer-sheet tracking. Manage exam-day with precision.
                            </Typography>
                        </div>

                        <div className="flex flex-wrap gap-5">
                            <Button size="lg" className="px-10 py-5 text-lg" onClick={handleDemoClick}>
                                Request Private Demo
                                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                            <Button variant="outline" size="lg" className="px-10 py-5 text-lg border-brand-200 dark:border-brand-800" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>
                                Watch Workflow
                            </Button>
                        </div>

                        <div className="pt-10 flex items-center space-x-10">
                            <div className="space-y-1">
                                <Typography className="text-2xl font-bold text-brand-950 dark:text-white">500+</Typography>
                                <Typography className="text-xs font-bold uppercase tracking-widest opacity-60">Schools Trusted</Typography>
                            </div>
                            <div className="h-10 w-px bg-brand-200 dark:bg-brand-800" />
                            <div className="space-y-1">
                                <Typography className="text-2xl font-bold text-brand-950 dark:text-white">99.9%</Typography>
                                <Typography className="text-xs font-bold uppercase tracking-widest opacity-60">Accuracy Rate</Typography>
                            </div>
                        </div>
                    </motion.div>

                    {/* Illustration/Mockup */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                        className="lg:col-span-5 relative"
                    >
                        <div className="relative z-10 p-4 glass rounded-[2.5rem] shadow-2xl rotate-3 animate-float">
                            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem]">
                                <Image
                                    src="/hero-illustration.png"
                                    alt="Exam Operations Illustration"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-600/20 blur-2xl rounded-full" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent-light/20 blur-3xl rounded-full" />
                    </motion.div>
                </div>
            </Container>
        </div>
    );
};
