import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one call-to-action style marketing asked for.
 * Usage: <PrimaryAction onClick={go}>Start trial</PrimaryAction>
 * Renders a <Button variant="solid" size="lg"> under the hood.
 */
export function PrimaryAction({ className, ...props }: ButtonProps) {
  return <Button size="lg" className={cn("rounded-full", className)} {...props} />;
}
