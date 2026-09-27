import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: { solid: "", soft: "border-transparent", outline: "", ghost: "border-transparent", link: "underline" },
    intent: { primary: "", neutral: "", danger: "", warning: "", success: "", info: "" },
    size: { sm: "text-[11px]", md: "text-xs" },
  },
  defaultVariants: { variant: "soft", intent: "neutral", size: "md" },
});

export function Badge({ className, variant, intent, size, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, intent, size }), className)} {...props} />;
}
