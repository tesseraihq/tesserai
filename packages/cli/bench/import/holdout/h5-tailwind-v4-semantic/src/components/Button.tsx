import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" };

export function Button({ variant = "solid", className, ...props }: Props) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variant === "solid" && "bg-accent text-accent-ink hover:bg-accent-hover",
        variant === "outline" && "border border-line bg-surface text-ink hover:bg-canvas",
        className,
      )}
      {...props}
    />
  );
}
