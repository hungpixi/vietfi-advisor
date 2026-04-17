import React from "react";
import { cn } from "@/lib/utils";

interface CyberTypographyProps extends React.HTMLAttributes<HTMLElement> {
    as?: React.ElementType;
    children: React.ReactNode;
    variant?: "heading" | "mono";
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "display";
}

type CyberTypographySize = NonNullable<CyberTypographyProps["size"]>;

interface CyberShortcutProps extends Omit<CyberTypographyProps, "as" | "variant"> {
    color?: string;
    size?: CyberTypographySize;
}

export function CyberTypography({
    as: Component = "span",
    variant = "heading",
    size = "md",
    className,
    children,
    ...props
}: CyberTypographyProps) {
    const baseStyles = variant === "heading" ? "font-heading uppercase font-black" : "font-mono font-black uppercase";

    const sizeStyles = {
        xs: "text-[10px] tracking-[0.2em]",
        sm: "text-[12px] tracking-wide",
        md: "text-base tracking-wider",
        lg: "text-xl md:text-2xl tracking-wider",
        xl: "text-2xl md:text-3xl tracking-wider leading-[1.1]",
        "2xl": "text-[48px] tracking-tighter leading-[1.1]",
        "3xl": "text-[64px] tracking-tighter leading-[1.1]",
        "4xl": "text-[72px] tracking-tighter leading-[1.1]",
        display: "text-[24px] sm:text-[32px] font-black uppercase leading-[1.1] tracking-wider",
    };

    return (
        <Component
            className={cn(baseStyles, sizeStyles[size as keyof typeof sizeStyles], className)}
            {...props}
        >
            {children}
        </Component>
    );
}

// Shortcut components for common specific styles from the spec
export const CyberHeader = ({ children, className, size = "display", ...props }: CyberShortcutProps) => (
    <CyberTypography as="h2" size={size} className={cn("text-white", className)} {...props}>
        {children}
    </CyberTypography>
);

export const CyberMetric = ({ children, className, size = "2xl", color = "text-white", ...props }: CyberShortcutProps) => (
    <CyberTypography size={size} className={cn(color, className)} {...props}>
        {children}
    </CyberTypography>
);

export const CyberSubHeader = ({ children, className, size = "xs", color = "text-white/40", ...props }: CyberShortcutProps) => (
    <CyberTypography variant="mono" size={size} className={cn(color, className)} {...props}>
        {children}
    </CyberTypography>
);
