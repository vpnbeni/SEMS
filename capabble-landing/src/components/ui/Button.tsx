import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = "primary",
    size = "md",
    className,
    children,
    ...props
}) => {
    const baseStyles =
        "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] hover:-translate-y-1 hover:shadow-lg";

    const variants = {
        primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]",
        secondary: "bg-brand-100 text-brand-900 hover:bg-brand-200 dark:bg-brand-800 dark:text-brand-100 dark:hover:bg-brand-700",
        outline: "border-2 border-brand-200 text-brand-900 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-100 dark:hover:bg-brand-900",
        ghost: "text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-900",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {children}
        </button>
    );
};
