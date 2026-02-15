"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Typography, SectionTitle } from "@/components/ui/Typography";
import { Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    { q: "Who is Capabble built for?", a: "Capabble is built for school administrators, exam coordinators, and data-entry teams managing centre-level examination operations." },
    { q: "Can Capabble handle CBSE-oriented workflows?", a: "Yes. Capabble includes datesheet, Form 66, seating, circular, and portal-oriented workflows aligned to CBSE-style operations." },
    { q: "How do we bring our existing exam data into Capabble?", a: "Capabble supports import-led workflows for key inputs such as datesheets, candidates, and Form 66 files." },
    { q: "Can we generate centre-specific datesheet views?", a: "Yes. Capabble supports centre-focused datesheet views that help teams operate on relevant entries." },
    { q: "Does Capabble generate printable seating outputs?", a: "Yes. Capabble provides downloadable seating plan outputs in multiple printable formats used in exam operations." },
    { q: "How does answer-sheet tracking work?", a: "Capabble tracks answer-sheet inventory across received, used, discarded, and balance states so teams can maintain operational accountability." },
    { q: "Can we assign duties to exam functionaries by room?", a: "Yes. Capabble supports date-wise duty assignment mapped to active rooms." },
    { q: "Is Capabble suitable for multiple institutions?", a: "Yes. Capabble includes tenant-based architecture with platform-level management and rollout workflows." },
    { q: "How does login work in a multi-tenant setup?", a: "Capabble supports tenant resolution by email and routes users into the correct tenant context." },
    { q: "Can Capabble be deployed in a standard cloud stack?", a: "Yes. Capabble supports deployment patterns using Vercel for frontends and AWS/Node-based backend setups with MongoDB." },
];

export const FAQ: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    return (
        <Section id="faq" className="relative">
            <Container size="sm">
                <SectionTitle
                    badge="Support"
                    title="Frequently Asked Questions"
                    subtitle="Everything you need to know about Capabble's institutional alignment."
                />

                <div className="mt-20 space-y-6">
                    {faqs.map((faq, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "glass rounded-3xl overflow-hidden transition-all duration-500 border-white/20 dark:border-brand-800/50 hover:shadow-xl hover:border-brand-600/30",
                                activeIndex === idx ? "shadow-2xl border-brand-600/50" : ""
                            )}
                        >
                            <button
                                onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
                                className="w-full px-8 py-6 flex items-center justify-between text-left group"
                            >
                                <Typography className={cn(
                                    "text-lg font-black transition-colors duration-300",
                                    activeIndex === idx ? "text-brand-600 dark:text-brand-400" : "text-brand-950 dark:text-white group-hover:text-brand-600"
                                )}>
                                    {faq.q}
                                </Typography>
                                <div className={cn(
                                    "flex-shrink-0 ml-4 p-2 rounded-xl transition-all duration-500",
                                    activeIndex === idx ? "bg-brand-600 text-white rotate-180" : "bg-brand-50 dark:bg-brand-900 text-brand-400 group-hover:bg-brand-100"
                                )}>
                                    {activeIndex === idx ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </div>
                            </button>
                            <AnimatePresence>
                                {activeIndex === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <div className="px-8 pb-8 pt-2 bg-brand-50/20 dark:bg-brand-900/10 border-t border-brand-100 dark:border-brand-800/50">
                                            <Typography className="text-lg font-medium opacity-70 leading-relaxed max-w-2xl">{faq.a}</Typography>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </Container>
        </Section>
    );
};
