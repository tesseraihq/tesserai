import type { Anatomy, Base } from "@tesserai/core";
import { BASE_UI_STATES, NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";
import { RAC_STATES } from "./react-aria/states";

// Breadcrumb's classes, which every framework's shell prints from. Radix's breadcrumb is plain
// HTML, so its states are the native pseudo-classes.
export function breadcrumbPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const list = flatClasses(anatomy, "list", { states }, ["flex", "flex-wrap", "items-center", "wrap-break-word"]);
  return {
    slots: {
      "breadcrumb-list": list,
      // Items space their link and separator like the list spaces its items.
      "breadcrumb-item": ["inline-flex", "items-center", ...list.filter((c) => c.startsWith("gap-"))],
      "breadcrumb-link": flatClasses(anatomy, "link", { states }, ["outline-none", "transition-colors"]),
      "breadcrumb-page": flatClasses(anatomy, "page", { states }, ["font-normal"]),
      "breadcrumb-separator": flatClasses(anatomy, "separator", { states }, ["inline-flex", "[&>svg]:size-full", "rtl:rotate-180"]),
      "breadcrumb-ellipsis": flatClasses(anatomy, "ellipsis", { states }, ["flex", "items-center", "justify-center", "[&>svg]:size-4"]),
    },
  };
}

// Breadcrumb as in shadcn: a nav with an ordered list. Base UI and Radix are plain HTML (the link
// renders as another element through Base UI's render prop or Radix's asChild); React Aria uses its
// Breadcrumbs collection, whose items draw their own separators.
export function breadcrumbTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots } = breadcrumbPieces(anatomy, base === "react-aria" ? RAC_STATES : base === "base-ui" ? BASE_UI_STATES : NATIVE_STATES);
    const list = slots["breadcrumb-list"];
    const item = slots["breadcrumb-item"];
    const link = slots["breadcrumb-link"];
    const page = slots["breadcrumb-page"];
    const separator = slots["breadcrumb-separator"];
    const ellipsis = slots["breadcrumb-ellipsis"];

    const shared = `function Breadcrumb(props: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn(${classString(page)}, className)} {...props} />;
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn(${classString(ellipsis)}, className)} {...props}>
      <MoreHorizontalIcon />
      <span className="sr-only">More</span>
    </span>
  );
}`;

    if (base === "react-aria") {
      return `import * as React from "react";
import {
  Breadcrumb as BreadcrumbPrimitive,
  Breadcrumbs as BreadcrumbsPrimitive,
  Link as LinkPrimitive,
  composeRenderProps,
  type BreadcrumbProps,
  type BreadcrumbsProps,
  type LinkProps,
} from "react-aria-components";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${shared}

function BreadcrumbList<T extends object>({ className, ...props }: BreadcrumbsProps<T>) {
  return <BreadcrumbsPrimitive data-slot="breadcrumb-list" className={cn(${classString(list)}, className)} {...props} />;
}

// Every item but the current one is followed by a separator.
function BreadcrumbItem({ className, children, separatorClassName, ...props }: BreadcrumbProps & { separatorClassName?: string }) {
  return (
    <BreadcrumbPrimitive data-slot="breadcrumb-item" className={composeRenderProps(className, (className) => cn(${classString(item)}, className))} {...props}>
      {composeRenderProps(children, (children, { isCurrent }) => (
        <>
          {children}
          {isCurrent ? null : (
            <span data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn(${classString(separator)}, separatorClassName)}>
              <ChevronRightIcon />
            </span>
          )}
        </>
      ))}
    </BreadcrumbPrimitive>
  );
}

function BreadcrumbLink({ className, ...props }: LinkProps) {
  return <LinkPrimitive data-slot="breadcrumb-link" className={composeRenderProps(className, (className) => cn(${classString(link)}, className))} {...props} />;
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbEllipsis };
`;
    }

    const linkSource =
      base === "base-ui"
        ? `function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<"a">) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">({ className: cn(${classString(link)}, className) }, props),
    render,
    state: { slot: "breadcrumb-link" },
  });
}`
        : `function BreadcrumbLink({ className, asChild = false, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return <Comp data-slot="breadcrumb-link" className={cn(${classString(link)}, className)} {...props} />;
}`;
    const imports =
      base === "base-ui"
        ? `import { mergeProps } from "@base-ui/react/merge-props";\nimport { useRender } from "@base-ui/react/use-render";`
        : `import { Slot } from "radix-ui";`;

    return `import * as React from "react";
${imports}
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${shared}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="breadcrumb-list" className={cn(${classString(list)}, className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn(${classString(item)}, className)} {...props} />;
}

${linkSource}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn(${classString(separator)}, className)} {...props}>
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
`;
  };
}
