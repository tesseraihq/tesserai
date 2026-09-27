import type { ReactNode } from "react";

// Marketing's own card: not the design system's.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <article className={`border border-zinc-200 ${className ?? ""}`}>{children}</article>;
}
