import type { Anatomy } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "../classes";
import { classString, cvaSource, q, unionType } from "../codegen";
import { factorClasses, flatClasses } from "../factor";

// Card's classes and sizes, the same on every library, which every framework's shell prints from.
// Without sizes the card is one class list rather than a cva. The header's action takes up to half
// its width (fit-content(50%)) and may shrink (min-w-0), so a long action ends in an ellipsis
// inside the card rather than pushing past it or squeezing the title to nothing.
export function cardPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const opts = { states };
  const root = factorClasses(anatomy, "root", opts, ["group/card", "flex", "flex-col"]);
  const sizes = anatomy.axes.size?.enabled ?? [];
  return {
    slots: {
      card: sizes.length === 0 ? root.base : root,
      "card-header": flatClasses(anatomy, "header", opts, [
        "grid",
        "auto-rows-min",
        "items-start",
        "gap-1.5",
        "has-data-[slot=card-action]:grid-cols-[1fr_fit-content(50%)]",
        "has-data-[slot=card-description]:grid-rows-[auto_auto]",
      ]),
      "card-title": flatClasses(anatomy, "title", opts, ["leading-none"]),
      "card-description": flatClasses(anatomy, "description", opts),
      "card-action": flatClasses(anatomy, "action", opts, ["col-start-2", "row-span-2", "row-start-1", "min-w-0", "max-w-full", "self-start", "justify-self-end"]),
      "card-content": flatClasses(anatomy, "content", opts),
      "card-footer": flatClasses(anatomy, "footer", opts, ["flex", "items-center"]),
    },
    sizes: [...sizes],
    defaultSize: anatomy.axes.size?.default ?? sizes[0] ?? "md",
  };
}

// shadcn's Card: size default | sm, and CardAction, which sits at the top right of the header.
export function renderCard(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = cardPieces(anatomy);

  const part = (name: string, slot: string, classes: string[]) => `function ${name}({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot=${JSON.stringify(slot)} className={cn(${classString(classes)}, className)} {...props} />;
}`;

  const card =
    Array.isArray(slots.card)
      ? part("Card", "card", slots.card)
      : `${cvaSource("cardVariants", slots.card)}

type Size = ${unionType(sizes)};

function Card({ className, size = "default", ...props }: React.ComponentProps<"div"> & { size?: Size | "default" }) {
  const resolved: Size = size === "default" ? ${q(defaultSize)} : size;
  return <div data-slot="card" data-size={resolved} className={cn(cardVariants({ size: resolved }), className)} {...props} />;
}`;

  return `import * as React from "react";
${sizes.length === 0 ? "" : `import { cva } from "class-variance-authority";\n`}import { cn } from "@/lib/utils";

${card}

${part("CardHeader", "card-header", slots["card-header"])}

${part("CardTitle", "card-title", slots["card-title"])}

${part("CardDescription", "card-description", slots["card-description"])}

${part("CardAction", "card-action", slots["card-action"])}

${part("CardContent", "card-content", slots["card-content"])}

${part("CardFooter", "card-footer", slots["card-footer"])}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
`;
}
