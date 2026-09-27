import type { Anatomy, Base } from "@tesserai/core";
import { BASE_UI_STATES, NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";
import { RADIX_STATES } from "./radix/states";
import { RAC_STATES } from "./react-aria/states";

const isMotion = (c: string) => c.startsWith("duration-") || c.startsWith("ease-");

// Radix opens its content with keyframes, not a transition, so the motion tokens become
// animation timing.
function asAnimation(classes: string[]): string[] {
  return classes.map((c) => {
    const duration = /^duration-\((.+)\)$/.exec(c);
    if (duration) return `[animation-duration:var(${duration[1]})]`;
    const ease = /^ease-\((.+)\)$/.exec(c) ?? /^ease-(.+)$/.exec(c);
    if (ease) return `[animation-timing-function:var(${ease[1]?.startsWith("--") ? ease[1] : `--ease-${ease[1]}`})]`;
    return c;
  });
}

// How each library opens a region to its measured height.
export function expandClasses(base: Base, component: "accordion" | "collapsible", motion: string[]): string[] {
  if (base === "base-ui") {
    const height = component === "accordion" ? "--accordion-panel-height" : "--collapsible-panel-height";
    return ["overflow-hidden", `h-(${height})`, "transition-[height]", "data-starting-style:h-0", "data-ending-style:h-0", ...motion];
  }
  if (base === "radix") {
    const height = component === "accordion" ? "--radix-accordion-content-height" : "--radix-collapsible-content-height";
    return ["overflow-hidden", `[--tesserai-expand-height:var(${height})]`, "data-[state=open]:animate-expand", "data-[state=closed]:animate-collapse", ...asAnimation(motion)];
  }
  return ["h-(--disclosure-panel-height)", "overflow-clip", "transition-[height]", ...motion];
}

const STATES: Record<Base, StatePrefixes> = { "base-ui": BASE_UI_STATES, radix: RADIX_STATES, "react-aria": RAC_STATES };

// Accordion's classes, which every framework's shell prints from. base picks the state attributes
// and how the content opens (Radix: keyframes to --radix-accordion-content-height, which Reka and
// Bits name --reka-… and --bits-…). The trigger sits in an unslotted header; the content's padding
// and type are on an unslotted inner div, so the animated element has none.
export function accordionPieces(anatomy: Anatomy, base: Base = "radix") {
  const states = STATES[base];
  const content = flatClasses(anatomy, "content", { states });
  return {
    slots: {
      accordion: ["flex", "w-full", "flex-col"],
      "accordion-item": flatClasses(anatomy, "item", { states, borderSides: "bottom" })
        // A rule between items, not after the last.
        .map((c) => (c.startsWith("border-b-(") ? `not-last:${c}` : c)),
      "accordion-trigger:header": ["flex"],
      "accordion-trigger": flatClasses(anatomy, "trigger", { states }, [
        "group/accordion-trigger",
        "relative",
        "flex",
        "flex-1",
        "items-start",
        "justify-between",
        "text-start",
        "outline-none",
        "transition-all",
      ]),
      "accordion-trigger-icon": flatClasses(anatomy, "icon", { states: NATIVE_STATES }, ["pointer-events-none", "shrink-0", "transition-transform", "group-aria-expanded/accordion-trigger:rotate-180"]),
      "accordion-content": expandClasses(base, "accordion", content.filter(isMotion)),
      "accordion-content:inner": [...content.filter((c) => !isMotion(c)), "pt-0", "[&_a]:underline", "[&_a]:underline-offset-3", "[&_p:not(:last-child)]:mb-4"],
    },
  };
}

export function accordionTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = accordionPieces(anatomy, base);
    const item = slots["accordion-item"];
    const trigger = slots["accordion-trigger"];
    const panel = slots["accordion-content"];
    const inner = slots["accordion-content:inner"];
    const chevron = `<ChevronDownIcon data-slot="accordion-trigger-icon" aria-hidden="true" className=${classString(slots["accordion-trigger-icon"])} />`;

    if (base === "react-aria") {
      return `import * as React from "react";
import {
  Button as ButtonPrimitive,
  Disclosure as DisclosurePrimitive,
  DisclosureGroup as DisclosureGroupPrimitive,
  DisclosurePanel as DisclosurePanelPrimitive,
  Heading as HeadingPrimitive,
  composeRenderProps,
  type ButtonProps,
  type DisclosureGroupProps,
  type DisclosurePanelProps,
  type DisclosureProps,
} from "react-aria-components";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// One open item at a time; allowsMultipleExpanded for several. Items are picked by id
// (defaultExpandedKeys / expandedKeys).
function Accordion({ className, ...props }: DisclosureGroupProps) {
  return <DisclosureGroupPrimitive data-slot="accordion" className={composeRenderProps(className, (className) => cn(${classString(slots.accordion)}, className))} {...props} />;
}

function AccordionItem({ className, ...props }: DisclosureProps) {
  return <DisclosurePrimitive data-slot="accordion-item" className={composeRenderProps(className, (className) => cn(${classString(item)}, className))} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: Omit<ButtonProps, "children"> & { children: React.ReactNode }) {
  return (
    <HeadingPrimitive className=${classString(slots["accordion-trigger:header"])}>
      <ButtonPrimitive slot="trigger" data-slot="accordion-trigger" className={composeRenderProps(className, (className) => cn(${classString(trigger)}, className))} {...props}>
        {children}
        ${chevron}
      </ButtonPrimitive>
    </HeadingPrimitive>
  );
}

function AccordionContent({ className, children, ...props }: DisclosurePanelProps) {
  return (
    <DisclosurePanelPrimitive data-slot="accordion-content" className=${classString(panel)} {...props}>
      <div className={cn(${classString(inner)}, className)}>{children}</div>
    </DisclosurePanelPrimitive>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
`;
    }

    const radix = base === "radix";
    const ns = "AccordionPrimitive";
    const Panel = radix ? "Content" : "Panel";
    const props = (part: string) => (radix ? `React.ComponentProps<typeof ${ns}.${part}>` : `Omit<React.ComponentProps<typeof ${ns}.${part}>, "className"> & { className?: string }`);
    return `import * as React from "react";
${radix ? `import { Accordion as ${ns} } from "radix-ui";` : `import { Accordion as ${ns} } from "@base-ui/react/accordion";`}
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ${radix ? `type="single" (with collapsible to allow closing) or type="multiple"; value / defaultValue.` : `One open item at a time; multiple for several. value / defaultValue are arrays.`}
function Accordion({ className, ...props }: ${props("Root")}) {
  return <${ns}.Root data-slot="accordion" className={cn(${classString(slots.accordion)}, className)} {...props} />;
}

function AccordionItem({ className, ...props }: ${props("Item")}) {
  return <${ns}.Item data-slot="accordion-item" className={cn(${classString(item)}, className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: ${props("Trigger")}) {
  return (
    <${ns}.Header className=${classString(slots["accordion-trigger:header"])}>
      <${ns}.Trigger data-slot="accordion-trigger" className={cn(${classString(trigger)}, className)} {...props}>
        {children}
        ${chevron}
      </${ns}.Trigger>
    </${ns}.Header>
  );
}

function AccordionContent({ className, children, ...props }: ${props(Panel)}) {
  return (
    <${ns}.${Panel} data-slot="accordion-content" className=${classString(panel)} {...props}>
      <div className={cn(${classString(inner)}, className)}>{children}</div>
    </${ns}.${Panel}>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
`;
  };
}

// Collapsible's classes, which every framework's shell prints from: only the content is styled, and
// only with how it opens (see accordionPieces).
export function collapsiblePieces(anatomy: Anatomy, base: Base = "radix") {
  const content = flatClasses(anatomy, "content", { states: STATES[base] });
  return { slots: { "collapsible-content": expandClasses(base, "collapsible", content.filter(isMotion)) } };
}

export function collapsibleTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const panel = collapsiblePieces(anatomy, base).slots["collapsible-content"];
    if (base === "react-aria") {
      return `import * as React from "react";
import {
  Button as ButtonPrimitive,
  Disclosure as DisclosurePrimitive,
  DisclosurePanel as DisclosurePanelPrimitive,
  composeRenderProps,
  type ButtonProps,
  type DisclosurePanelProps,
  type DisclosureProps,
} from "react-aria-components";
import { cn } from "@/lib/utils";

// isExpanded / defaultExpanded / onExpandedChange control it.
function Collapsible(props: DisclosureProps) {
  return <DisclosurePrimitive data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: ButtonProps) {
  return <ButtonPrimitive slot="trigger" data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: DisclosurePanelProps) {
  return <DisclosurePanelPrimitive data-slot="collapsible-content" className={composeRenderProps(className, (className) => cn(${classString(panel)}, className))} {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
`;
    }
    const radix = base === "radix";
    const ns = "CollapsiblePrimitive";
    return `import * as React from "react";
${radix ? `import { Collapsible as ${ns} } from "radix-ui";` : `import { Collapsible as ${ns} } from "@base-ui/react/collapsible";`}
import { cn } from "@/lib/utils";

// open / defaultOpen / onOpenChange control it.
function Collapsible(props: React.ComponentProps<typeof ${ns}.Root>) {
  return <${ns}.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: React.ComponentProps<typeof ${ns}.${radix ? "CollapsibleTrigger" : "Trigger"}>) {
  return <${ns}.${radix ? "CollapsibleTrigger" : "Trigger"} data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({ className, ...props }: ${radix ? `React.ComponentProps<typeof ${ns}.CollapsibleContent>` : `Omit<React.ComponentProps<typeof ${ns}.Panel>, "className"> & { className?: string }`}) {
  return <${ns}.${radix ? "CollapsibleContent" : "Panel"} data-slot="collapsible-content" className={cn(${classString(panel)}, className)} {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
`;
  };
}
