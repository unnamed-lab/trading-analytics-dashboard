import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/25 hover:bg-[#0284c7] hover:shadow-[#0ea5e9]/30",
        destructive: "bg-[#f43f5e] text-white hover:bg-[#e11d48]",
        outline:
          "border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-slate-100 text-slate-300",
        secondary: "bg-white/10 text-slate-100 hover:bg-white/15 border border-white/10",
        ghost: "hover:bg-white/5 hover:text-slate-100 text-slate-300",
        link: "text-[#0ea5e9] underline-offset-4 hover:underline",
        success: "bg-[#22c55e] text-white hover:bg-[#16a34a]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
