import React from "react";
import { Container } from "@/components/ui/Container";
import { Typography } from "@/components/ui/Typography";
import { ShieldCheck, Mail, Globe, MapPin } from "lucide-react";
import Link from "next/link";

export const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white dark:bg-brand-950 border-t border-brand-100 dark:border-brand-900 py-24">
            <Container>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
                    {/* Brand Info */}
                    <div className="space-y-8">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="bg-brand-600 p-2 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-brand-950 dark:text-white font-serif">
                                Capabble
                            </span>
                        </Link>
                        <Typography className="text-base font-medium opacity-60 max-w-xs leading-relaxed">
                            Revolutionizing school exam operations through structured planning and precise execution tracking.
                        </Typography>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-8">
                        <Typography variant="h4" as="h4" className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">
                            Platform
                        </Typography>
                        <ul className="space-y-4">
                            {["Solution", "Workflow", "Features", "Security"].map((item) => (
                                <li key={item}>
                                    <Link href={`#${item.toLowerCase()}`} className="text-base font-bold text-brand-950/70 dark:text-white/60 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Institutional */}
                    <div className="space-y-8">
                        <Typography variant="h4" as="h4" className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">
                            Operational
                        </Typography>
                        <ul className="space-y-4">
                            {["CBSE Workflow", "Form 66 Handling", "Inventory", "Deployment"].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-base font-bold text-brand-950/70 dark:text-white/60 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-8">
                        <Typography variant="h4" as="h4" className="text-xs font-black uppercase tracking-[0.3em] text-brand-600 dark:text-brand-400">
                            Connect
                        </Typography>
                        <ul className="space-y-5">
                            <li className="flex items-center space-x-4 text-base font-bold text-brand-950/70 dark:text-white/60">
                                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900 text-brand-600">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span>contact@capabble.cloud</span>
                            </li>
                            <li className="flex items-center space-x-4 text-base font-bold text-brand-950/70 dark:text-white/60">
                                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900 text-brand-600">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <span>capabble.cloud</span>
                            </li>
                            <li className="flex items-start space-x-4 text-base font-bold text-brand-950/70 dark:text-white/60">
                                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-900 text-brand-600 flex-shrink-0">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <span className="leading-snug">Available for institutional onboarding worldwide.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-12 border-t border-brand-100 dark:border-brand-900 flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
                    <Typography className="text-sm font-bold opacity-40">
                        © {currentYear} Capabble.cloud. Built for accuracy.
                    </Typography>
                    <div className="flex space-x-10">
                        <Link href="#" className="text-sm font-bold opacity-40 hover:opacity-100 transition-opacity">Privacy Policy</Link>
                        <Link href="#" className="text-sm font-bold opacity-40 hover:opacity-100 transition-opacity">Terms of Service</Link>
                    </div>
                </div>
            </Container>
        </footer>
    );
};

