import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "mint" | "outline" | "dark" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "mint", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8EE3D6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Filled mint pill button: dark navy text on mint to pass WCAG AA
            "bg-[#8EE3D6] text-[#0E1020] hover:bg-[#7BD4C7] shadow-sm rounded-full active:scale-[0.98]":
              variant === "mint",
            // Outlined pill: 1px border, transparent background
            "border border-white/60 bg-transparent text-white hover:bg-white/10 hover:border-white rounded-full active:scale-[0.98]":
              variant === "outline",
            // Strong dark button for forms / checkout
            "bg-[#0E1020] text-white hover:bg-[#1A1D36] rounded-full active:scale-[0.98]":
              variant === "dark",
            // Ghost
            "bg-transparent text-[#6B7280] hover:text-[#0E1020] hover:bg-gray-100 rounded-lg":
              variant === "ghost",
          },
          {
            "px-6 py-2.5 text-sm": size === "default",
            "px-4 py-1.5 text-xs": size === "sm",
            "px-8 py-3.5 text-base": size === "lg",
            "h-9 w-9 p-0 rounded-full": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

