import * as React from "react";
import { cn } from "@/lib/utils";

type AlertProps = React.ComponentProps<"div"> & {
  variant?: "outline" | "soft";
  intent?: "primary" | "neutral" | "danger" | "warning" | "success" | "info";
};

export function Alert({ className, variant = "outline", intent = "neutral", ...props }: AlertProps) {
  return <div role="alert" data-slot="alert" data-variant={variant} data-intent={intent} className={cn("relative grid w-full rounded-lg border px-4 py-3 text-sm", className)} {...props} />;
}
export function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-medium tracking-tight", className)} {...props} />;
}
export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
