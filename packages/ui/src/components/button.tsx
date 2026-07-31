"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Brand primary — navy (never purple).
        default: "bg-navy text-white hover:scale-[1.02]",
        gold: "bg-gold text-ink hover:scale-[1.02]",
        jade: "bg-jade text-white hover:scale-[1.02]",
        secondary: "bg-sand text-ink hover:bg-sand/70",
        outline: "border border-ink/15 bg-transparent text-ink hover:border-ink/40",
        ghost: "text-ink hover:bg-ink/5",
        destructive: "bg-[#DC2626] text-white hover:opacity-90",
        link: "rounded-none text-navy underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
