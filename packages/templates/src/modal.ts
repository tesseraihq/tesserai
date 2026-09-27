import { cssVarName, type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, mapStates, type StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatClasses } from "./factor";
import { RADIX_STATES } from "./radix/states";
import { RAC_STATES } from "./react-aria/states";
import { BITS_STATES } from "./svelte/states";

export type ModalKind = "dialog" | "alert-dialog" | "sheet";
type Flavor = "base-ui" | "radix" | "react-aria" | "bits-ui";

const STATES: Record<Flavor, StatePrefixes> = { "base-ui": BASE_UI_STATES, radix: RADIX_STATES, "react-aria": RAC_STATES, "bits-ui": BITS_STATES };

// How each library animates a modal in and out: Base UI transitions from starting/ending styles,
// Radix and React Aria run keyframes on their open/closed (entering/exiting) attributes. Bits UI
// (Svelte) takes Radix's: it sets the same data-state on its overlay and content and waits for their
// animations before unmounting, so the keyframes the preview shows run unchanged.
const MOTION: Record<Exclude<Flavor, "bits-ui">, { backdrop: string[]; center: string[]; slide: string[] }> = {
  "base-ui": {
    backdrop: ["transition-opacity", "data-starting-style:opacity-0", "data-ending-style:opacity-0"],
    center: ["transition-[opacity,scale]", "data-starting-style:opacity-0", "data-starting-style:scale-95", "data-ending-style:opacity-0", "data-ending-style:scale-95"],
    slide: ["transition-[translate]", "data-starting-style:[translate:var(--tesserai-slide-from)]", "data-ending-style:[translate:var(--tesserai-slide-from)]"],
  },
  radix: {
    backdrop: ["data-[state=open]:animate-fade-in", "data-[state=closed]:animate-fade-out"],
    center: ["data-[state=open]:animate-enter", "data-[state=closed]:animate-exit"],
    slide: ["data-[state=open]:animate-slide-in", "data-[state=closed]:animate-slide-out"],
  },
  "react-aria": {
    backdrop: ["data-entering:animate-fade-in", "data-exiting:animate-fade-out"],
    center: ["data-entering:animate-enter", "data-exiting:animate-exit"],
    slide: ["data-entering:animate-slide-in", "data-exiting:animate-slide-out"],
  },
};

const CENTERED = ["fixed", "top-1/2", "left-1/2", "z-50", "flex", "w-[calc(100%-2rem)]", "-translate-x-1/2", "-translate-y-1/2", "flex-col", "outline-none"];

// A sheet sits on the side named by data-side and slides in from it (flipped for right-to-left).
function sheetSides(): string[] {
  const width = `var(${cssVarName("sheet.width")})`;
  const height = `var(${cssVarName("sheet.max-height")})`;
  return [
    "fixed",
    "z-50",
    "flex",
    "flex-col",
    "outline-none",
    "data-[side=right]:inset-y-0",
    "data-[side=right]:end-0",
    "data-[side=right]:h-full",
    "data-[side=right]:w-3/4",
    `data-[side=right]:max-w-[${width}]`,
    "data-[side=right]:[--tesserai-slide-from:100%_0]",
    "rtl:data-[side=right]:[--tesserai-slide-from:-100%_0]",
    "data-[side=left]:inset-y-0",
    "data-[side=left]:start-0",
    "data-[side=left]:h-full",
    "data-[side=left]:w-3/4",
    `data-[side=left]:max-w-[${width}]`,
    "data-[side=left]:[--tesserai-slide-from:-100%_0]",
    "rtl:data-[side=left]:[--tesserai-slide-from:100%_0]",
    "data-[side=top]:inset-x-0",
    "data-[side=top]:top-0",
    `data-[side=top]:max-h-[${height}]`,
    "data-[side=top]:[--tesserai-slide-from:0_-100%]",
    "data-[side=bottom]:inset-x-0",
    "data-[side=bottom]:bottom-0",
    `data-[side=bottom]:max-h-[${height}]`,
    "data-[side=bottom]:[--tesserai-slide-from:0_100%]",
  ];
}

const CLOSE_BASE = ["absolute", "top-4", "end-4", "inline-flex", "size-7", "items-center", "justify-center", "outline-none", "[&_svg]:size-4"];

export function modalClasses(anatomy: Anatomy, kind: ModalKind, flavor: Flavor) {
  const states = STATES[flavor];
  const m = MOTION[flavor === "bits-ui" ? "radix" : flavor];
  const part = (name: string, extra: string[] = []) => (anatomy.parts.includes(name) ? classString(flatClasses(anatomy, name, { states }, extra)) : q(extra.join(" ")));
  // React Aria's overlay lays the dialog out; Base UI and Radix position the popup themselves.
  const centered = flavor === "react-aria" ? ["relative", "mx-auto", "flex", "w-full", "flex-col", "outline-none"] : CENTERED;
  const popupExtra = kind === "sheet" ? [...sheetSides(), ...m.slide] : [...centered, ...m.center];
  // Alert dialog sizes change its width: the popup is a cva by size.
  const popup =
    kind === "alert-dialog"
      ? factorClasses(anatomy, "popup", { states: mapStates(() => []) }, popupExtra)
      : null;
  return {
    backdrop: part("backdrop", ["fixed", "inset-0", "z-50", ...m.backdrop]),
    popup: popup === null ? part("popup", popupExtra) : null,
    popupCva: popup === null ? null : cvaSource(`${kind === "alert-dialog" ? "alertDialog" : kind}ContentVariants`, popup),
    header: part("header", ["flex", "flex-col", ...(kind === "sheet" ? [] : [])]),
    footer: part("footer", kind === "sheet" ? ["mt-auto", "flex", "flex-col", "gap-2"] : ["flex", "flex-col-reverse", "gap-2", "sm:flex-row", "sm:justify-end"]),
    title: part("title", ["leading-none"]),
    description: part("description"),
    close: part("close", CLOSE_BASE),
    media: part("media", ["mb-2", "inline-flex", "items-center", "justify-center", "[&_svg]:size-5"]),
    sizes: unionType(anatomy.axes.size?.enabled ?? []),
    defaultSize: q(anatomy.axes.size?.default ?? "md"),
  };
}
