import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"input">, "size"> & { size?: "sm" | "md" | "lg" };

export function Input({ className, size = "md", type, ...props }: Props) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      className={cn("h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none", className)}
      {...props}
    />
  );
}
