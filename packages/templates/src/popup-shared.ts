import type { StatePrefixes } from "./classes";

// What a popup's pieces take from its library: its state attributes, and the popup's own
// positioning and enter/exit classes. Radix's are keyframes on data-state; a Svelte shell may pass
// Base UI's transitions instead.
export type PopupFlavor = { states: StatePrefixes; motion: string[] };

// Enter and exit motion shared by every floating popup, per library's own open/close attributes.
export const BASE_POPUP_MOTION = [
  "z-50",
  "outline-none",
  "origin-(--transform-origin)",
  "transition-[opacity,scale]",
  "data-starting-style:opacity-0",
  "data-starting-style:scale-95",
  "data-ending-style:opacity-0",
  "data-ending-style:scale-95",
];

export const RADIX_POPUP_MOTION = [
  "z-50",
  "outline-none",
  "origin-(--radix-popover-content-transform-origin)",
  "data-[state=open]:animate-enter",
  "data-[state=closed]:animate-exit",
];

export const RAC_POPUP_MOTION = ["z-50", "outline-none", "data-entering:animate-enter", "data-exiting:animate-exit"];
