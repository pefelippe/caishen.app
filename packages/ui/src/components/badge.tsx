"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-pill border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-navy text-white",
        jade: "border-transparent bg-jade text-white",
        gold: "border-transparent bg-gold text-ink",
        secondary: "border-transparent bg-sand text-ink",
        outline: "border-ink/15 text-ink",
        destructive: "border-transparent bg-[#DC2626] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
