"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Solution } from "@/components/sections/Solution";
import { Workflow } from "@/components/sections/Workflow";
import { Features } from "@/components/sections/Features";
import { MultiTenant } from "@/components/sections/MultiTenant";
import { Security } from "@/components/sections/Security";
import { Implementation } from "@/components/sections/Implementation";
import { FAQ } from "@/components/sections/FAQ";
import { CTABand } from "@/components/sections/CTABand";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-x-hidden">
      <Navbar />

      <div className="relative z-10">
        <Hero />
        <Problem />
        <Solution />
        <Workflow />
        <Features />
        <MultiTenant />
        <Security />
        <Implementation />
        <FAQ />
        <CTABand />
      </div>

      <Footer />
      
      {/* Global Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-400/5 blur-[120px] rounded-full" />
      </div>
    </main>
  );
}
