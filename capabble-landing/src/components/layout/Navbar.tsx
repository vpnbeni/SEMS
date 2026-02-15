"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "./ThemeToggle";
import { Menu, X, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";

const navLinks = [
    { name: "Solution", href: "#solution" },
    { name: "Workflow", href: "#workflow" },
    { name: "Features", href: "#features" },
    { name: "Security", href: "#security" },
    { name: "FAQ", href: "#faq" },
];

export const Navbar: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleDemoClick = () => {
        toast.success("Thank you for your interest! A demo request has been initiated.");
    };

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
                isScrolled
                    ? "bg-white/70 dark:bg-brand-950/70 backdrop-blur-xl py-3 border-b border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
                    : "bg-transparent py-6 border-b border-transparent"
            )}
        >
            <Container className="flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center space-x-3 group">
                    <div className="bg-gradient-to-br from-brand-600 to-brand-400 p-2 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-brand-950 dark:text-white font-serif">
                        Capabble
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center space-x-10">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-bold text-brand-900/70 dark:text-brand-100/70 hover:text-brand-600 dark:hover:text-brand-400 transition-colors relative group"
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-600 dark:bg-brand-400 transition-all group-hover:w-full" />
                        </Link>
                    ))}
                </div>

                {/* Actions */}
                <div className="hidden md:flex items-center space-x-6">
                    <ThemeToggle />
                    <Button size="sm" onClick={handleDemoClick} className="shadow-md">
                        Get Started
                    </Button>
                </div>

                {/* Mobile Toggle */}
                <div className="md:hidden flex items-center space-x-4">
                    <ThemeToggle />
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="text-brand-900 dark:text-brand-100 p-1"
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </Container>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-brand-900 border-b border-brand-100 dark:border-brand-800 p-4 space-y-4 animate-fade-in shadow-xl">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-base font-medium text-brand-700 dark:text-brand-300 py-2 border-b border-brand-50 dark:border-brand-800/50"
                        >
                            {link.name}
                        </Link>
                    ))}
                    <Button className="w-full justify-center" onClick={handleDemoClick}>
                        Request Demo
                    </Button>
                </div>
            )}
        </nav>
    );
};
