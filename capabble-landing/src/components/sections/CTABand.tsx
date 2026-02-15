"use client";

import React from "react";
import { Container } from "@/components/ui/Container";
import { Typography } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

export const CTABand: React.FC = () => {
    const handleDemoClick = () => {
        toast.success("Request Demo initiated. We will contact you soon.");
    };

    return (
        <div className="py-32 relative overflow-hidden bg-brand-950">
            {/* Background accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-950 to-brand-900 -z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-brand-600/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-400/5 rounded-full blur-[120px] -mr-48 -mt-48" />

            <Container>
                <div className="flex flex-col items-center text-center space-y-12 max-w-5xl mx-auto">
                    <div className="space-y-6">
                        <Typography variant="h1" as="h2" className="text-white leading-[1.1]">
                            Ready to simplify examination operations with <span className="text-brand-400">Capabble?</span>
                        </Typography>
                        <Typography className="text-xl md:text-2xl text-brand-100/70 font-medium max-w-3xl mx-auto leading-relaxed">
                            See how your team can move from fragmented manual processes to one coordinated, audit-friendly workflow.
                        </Typography>
                    </div>

                    <div className="flex flex-wrap justify-center gap-6 pt-6">
                        <Button size="lg" className="bg-white text-brand-600 hover:bg-brand-50 px-12 py-6 text-xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all" onClick={handleDemoClick}>
                            Request Private Demo
                        </Button>
                        <Button variant="outline" size="lg" className="border-brand-800 text-white hover:bg-brand-900 px-12 py-6 text-xl active:scale-95 transition-all" onClick={() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' })}>
                            See Workflow
                        </Button>
                    </div>

                    <div className="pt-8 flex flex-col items-center space-y-4">
                        <Typography className="text-sm font-black uppercase tracking-[0.3em] text-brand-500 opacity-60">
                            Transparent Commitment
                        </Typography>
                        <Typography className="text-base text-brand-100/40 font-bold max-w-xl italic">
                            No inflated claims. Just a practical walkthrough of how Capabble supports real school exam operations.
                        </Typography>
                    </div>
                </div>
            </Container>
        </div>
    );
};
