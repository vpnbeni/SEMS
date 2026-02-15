import React from "react";
import { cn } from "@/lib/utils";

interface TypographyProps {
    children: React.ReactNode;
    className?: string;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
    variant?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export const Typography: React.FC<TypographyProps> = ({
    children,
    className,
    as: Component = "p",
    variant,
}) => {
    const baseStyles = "leading-relaxed";
    const styles: Record<string, string> = {
        h1: "text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]",
        h2: "text-4xl md:text-5xl font-bold tracking-tight leading-tight",
        h3: "text-3xl md:text-4xl font-bold tracking-tight",
        h4: "text-2xl md:text-3xl font-semibold",
        p: "text-lg md:text-xl text-brand-900/70 dark:text-brand-100/70",
        span: "",
    };

    const activeVariant = variant || (Component as string);

    return (
        <Component className={cn(baseStyles, styles[activeVariant] || styles.p, className)}>
            {children}
        </Component>
    );
};

export const SectionTitle: React.FC<{
    title: string;
    subtitle?: string;
    alignment?: "left" | "center";
    className?: string;
    badge?: string;
}> = ({ title, subtitle, alignment = "center", className, badge }) => {
    return (
        <div
            className={cn(
                "mb-16 space-y-4",
                alignment === "center" ? "text-center mx-auto max-w-4xl" : "text-left",
                className
            )}
        >
            {badge && (
                <div className={cn(
                    "inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 mb-2",
                    alignment === "center" ? "mx-auto" : ""
                )}>
                    {badge}
                </div>
            )}
            <Typography as="h2" className="text-brand-950 dark:text-white">
                {title}
            </Typography>
            {subtitle && (
                <Typography as="p" className="text-xl font-medium opacity-80 max-w-2xl mx-auto">
                    {subtitle}
                </Typography>
            )}
            <div
                className={cn(
                    "h-1.5 w-24 rounded-full bg-gradient-to-r from-brand-600 to-brand-400",
                    alignment === "center" ? "mx-auto" : ""
                )}
            />
        </div>
    );
};
