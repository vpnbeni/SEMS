"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Section: React.FC<{
    children: React.ReactNode;
    className?: string;
    id?: string;
    reveal?: boolean;
}> = ({ children, className, id, reveal = true }) => {
    if (!reveal) {
        return (
            <section id={id} className={cn("py-16 md:py-24", className)}>
                {children}
            </section>
        );
    }

    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn("py-16 md:py-24", className)}
        >
            {children}
        </motion.section>
    );
};
