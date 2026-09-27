import type { Anatomy } from "@tesserai/core";
import type { StatePrefixes } from "./classes";
import { flatClasses } from "./factor";

// The tooltip arrow as in shadcn: a small rotated square in the popup's color, its centre just
// inside the edge facing the trigger. Radix's Arrow is an SVG, so it takes the fill color too.
export function arrowClasses(anatomy: Anatomy, states: StatePrefixes, placement: string[]): string[] {
  const own = flatClasses(anatomy, "arrow", { states });
  const fill = own.filter((c) => c.startsWith("bg-")).map((c) => `fill-${c.slice(3)}`);
  return ["z-50", "rotate-45", "rounded-[2px]", ...placement, ...own, ...fill];
}

// Base UI places the arrow along the edge; these put it on the edge for each side.
export const BASE_UI_ARROW = [
  "data-[side=top]:top-full",
  "data-[side=top]:translate-y-[calc(-50%-2px)]",
  "data-[side=bottom]:bottom-full",
  "data-[side=bottom]:translate-y-[calc(50%+2px)]",
  "data-[side=left]:left-full",
  "data-[side=left]:translate-x-[calc(-50%-2px)]",
  "data-[side=right]:right-full",
  "data-[side=right]:translate-x-[calc(50%+2px)]",
  "data-[side=inline-start]:left-full",
  "data-[side=inline-start]:translate-x-[calc(-50%-2px)]",
  "data-[side=inline-end]:right-full",
  "data-[side=inline-end]:translate-x-[calc(50%+2px)]",
];

// Radix turns the arrow's wrapper to face each side, so one offset serves them all.
export const RADIX_ARROW = ["translate-y-[calc(-50%-2px)]"];
