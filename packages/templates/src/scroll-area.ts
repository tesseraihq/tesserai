import { cssVarRef, isTokenRef, refPath, resolveRecipe, type Anatomy, type Base } from "@tesserai/core";
import { BASE_UI_STATES, NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";
import { RADIX_STATES } from "./radix/states";

// Scroll Area's classes where the library draws the scrollbar (Radix, Base UI, and Reka and Bits
// after Radix), which every framework's shell prints from. The bar's thickness runs across it,
// whichever way it points: it reads the data-orientation the templates set on it. A word longer than
// the viewport breaks (wrap-anywhere, which also lets Radix's table-display content box shrink to
// the viewport) rather than running past it; content that means to scroll sideways says so with
// whitespace-nowrap or w-max, which overflow-wrap leaves alone.
export function scrollAreaPieces(anatomy: Anatomy, states: StatePrefixes = RADIX_STATES) {
  return {
    slots: {
      "scroll-area": ["relative"],
      "scroll-area-viewport": flatClasses(anatomy, "viewport", { states }, ["size-full", "wrap-anywhere", "outline-none", "transition-[color,box-shadow]"]),
      "scroll-area-scrollbar": flatClasses(anatomy, "scrollbar", { states }, ["flex", "touch-none", "select-none", "transition-colors"]).flatMap((c) =>
        c.startsWith("w-") ? [`data-[orientation=vertical]:${c}`, "data-[orientation=vertical]:h-full", `data-[orientation=horizontal]:h-${c.slice(2)}`, "data-[orientation=horizontal]:flex-col"] : [c],
      ),
      "scroll-area-thumb": flatClasses(anatomy, "thumb", { states }, ["relative", "flex-1"]),
    },
  };
}

// Scroll Area as in shadcn. Base UI and Radix draw their own scrollbar (its thickness runs across
// the bar, whichever way it points); React Aria has no primitive, so it is a native scrolling div
// whose scrollbar takes the thumb's color.
export function scrollAreaTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    if (base === "react-aria") {
      const thumb = resolveRecipe(anatomy, {})["thumb"]?.base.background;
      const color = thumb !== undefined && isTokenRef(thumb) ? cssVarRef(refPath(thumb)) : "currentColor";
      const viewport = flatClasses(anatomy, "viewport", { states: NATIVE_STATES }, [
        "relative",
        "overflow-auto",
        "outline-none",
        "[scrollbar-width:thin]",
        `[scrollbar-color:${color}_transparent]`,
      ]);
      return `import * as React from "react";
import { cn } from "@/lib/utils";

// React Aria has no scroll area; the browser scrolls, with a thin scrollbar in the system's colors.
// Focusable so the keyboard can scroll it.
function ScrollArea({ className, children, tabIndex = 0, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="scroll-area" tabIndex={tabIndex} className={cn(${classString(viewport)}, className)} {...props}>
      {children}
    </div>
  );
}

export { ScrollArea };
`;
    }

    const { slots } = scrollAreaPieces(anatomy, base === "radix" ? RADIX_STATES : BASE_UI_STATES);
    const viewport = slots["scroll-area-viewport"];
    const bar = slots["scroll-area-scrollbar"];
    const thumb = slots["scroll-area-thumb"];
    const radix = base === "radix";
    const ns = "ScrollAreaPrimitive";
    const Scrollbar = radix ? "ScrollAreaScrollbar" : "Scrollbar";
    const Thumb = radix ? "ScrollAreaThumb" : "Thumb";
    const props = (part: string) => (radix ? `React.ComponentProps<typeof ${ns}.${part}>` : `Omit<React.ComponentProps<typeof ${ns}.${part}>, "className"> & { className?: string }`);

    return `import * as React from "react";
${radix ? `import { ScrollArea as ${ns} } from "radix-ui";` : `import { ScrollArea as ${ns} } from "@base-ui/react/scroll-area";`}
import { cn } from "@/lib/utils";

function ScrollArea({ className, children, ...props }: ${props("Root")}) {
  return (
    <${ns}.Root data-slot="scroll-area" className={cn(${classString(slots["scroll-area"])}, className)} {...props}>
      {/* Focusable so the keyboard can scroll it (Base UI's viewport already is). */}
      <${ns}.Viewport data-slot="scroll-area-viewport"${radix ? " tabIndex={0}" : ""} className=${classString(viewport)}>
        {children}
      </${ns}.Viewport>
      <ScrollBar />
      <${ns}.Corner />
    </${ns}.Root>
  );
}

// A vertical bar comes with every ScrollArea; add <ScrollBar orientation="horizontal" /> to scroll sideways.
function ScrollBar({ className, orientation = "vertical", ...props }: ${props(Scrollbar)}) {
  return (
    <${ns}.${Scrollbar} data-slot="scroll-area-scrollbar" data-orientation={orientation} orientation={orientation} className={cn(${classString(bar)}, className)} {...props}>
      <${ns}.${Thumb} data-slot="scroll-area-thumb" className=${classString(thumb)} />
    </${ns}.${Scrollbar}>
  );
}

export { ScrollArea, ScrollBar };
`;
  };
}
