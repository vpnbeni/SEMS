import React from "react";
import { cn } from "@/lib/utils";

export const Container: React.FC<{
    children: React.ReactNode;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl" | "full";
}> = ({ children, className, size = "lg" }) => {
    const sizes = {
        sm: "max-w-3xl",
        md: "max-w-5xl",
        lg: "max-w-7xl",
        xl: "max-w-[1440px]",
        full: "max-w-full",
    };

    return (
        <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 w-full", sizes[size], className)}>
            {children}
        </div>
    );
};
