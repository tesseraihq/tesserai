import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString, q } from "./codegen";
import { flatClasses } from "./factor";

// Pagination's classes, which every framework's shell prints from. A page link is the Button
// component (see link) with no classes of its own; Previous and Next are page links with an icon and
// a label, the label hidden on small screens. Squeezed, the list and its items shrink (min-w-0) and
// a label ends in an ellipsis rather than pushing the list past the nav.
export function paginationPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  return {
    slots: {
      pagination: ["mx-auto", "flex", "w-full", "justify-center"],
      "pagination-content": flatClasses(anatomy, "content", { states }, ["flex", "min-w-0", "items-center"]),
      "pagination-item": ["min-w-0"],
      "pagination-ellipsis": flatClasses(anatomy, "ellipsis", { states }, ["flex", "items-center", "justify-center", "[&_svg]:size-4"]),
      "pagination-link:previous": ["ps-2!"],
      "pagination-link:next": ["pe-2!"],
      // Previous's and Next's chevrons, which point the other way right to left.
      "pagination-link:icon": ["rtl:rotate-180"],
      "pagination-link:label": ["hidden", "min-w-0", "truncate", "sm:block"],
    },
    // The Button a page link renders: ghost, outline for the current page; icon-sized, and
    // default-sized for Previous and Next.
    link: { variant: "ghost", activeVariant: "outline", size: "icon", edgeSize: "default" },
  };
}

// Pagination as in shadcn: page links are the system's Button (ghost, outline for the current
// page), rendered as links: Base UI's render prop, Radix's asChild, React Aria's LinkButton.
export function paginationTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, link: button } = paginationPieces(anatomy);
    const content = slots["pagination-content"];
    const ellipsis = slots["pagination-ellipsis"];

    const link =
      base === "base-ui"
        ? `type PaginationLinkProps = { isActive?: boolean } & Pick<ButtonVariantProps, "size"> & React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = ${q(button.size)}, ...props }: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? ${q(button.activeVariant)} : ${q(button.variant)}}
      size={size}
      className={className}
      nativeButton={false}
      render={<a aria-current={isActive ? "page" : undefined} data-slot="pagination-link" data-active={isActive} {...props} />}
    />
  );
}`
        : base === "radix"
          ? `type PaginationLinkProps = { isActive?: boolean } & Pick<ButtonVariantProps, "size"> & React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = ${q(button.size)}, ...props }: PaginationLinkProps) {
  return (
    <Button asChild variant={isActive ? ${q(button.activeVariant)} : ${q(button.variant)}} size={size} className={className}>
      <a aria-current={isActive ? "page" : undefined} data-slot="pagination-link" data-active={isActive} {...props} />
    </Button>
  );
}`
          : `type PaginationLinkProps = { isActive?: boolean } & Omit<React.ComponentProps<typeof LinkButton>, "variant">;

function PaginationLink({ isActive, size = ${q(button.size)}, ...props }: PaginationLinkProps) {
  return (
    <LinkButton
      aria-current={isActive ? "page" : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      variant={isActive ? ${q(button.activeVariant)} : ${q(button.variant)}}
      size={size}
      {...props}
    />
  );
}`;
    const buttonImport = base === "react-aria" ? `import { LinkButton } from "@/components/ui/button";` : `import { Button, type ButtonVariantProps } from "@/components/ui/button";`;

    return `import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
${buttonImport}

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return <nav role="navigation" aria-label="pagination" data-slot="pagination" className={cn(${classString(slots.pagination)}, className)} {...props} />;
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn(${classString(content)}, className)} {...props} />;
}

function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" className={cn(${classString(slots["pagination-item"])}, className)} {...props} />;
}

${link}

function PaginationPrevious({ className, text = "Previous", ...props }: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink aria-label="Go to previous page" size=${q(button.edgeSize)} className={cn(${classString(slots["pagination-link:previous"])}, className)} {...props}>
      <ChevronLeftIcon data-icon="inline-start" className=${classString(slots["pagination-link:icon"])} />
      <span className=${classString(slots["pagination-link:label"])}>{text}</span>
    </PaginationLink>
  );
}

function PaginationNext({ className, text = "Next", ...props }: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink aria-label="Go to next page" size=${q(button.edgeSize)} className={cn(${classString(slots["pagination-link:next"])}, className)} {...props}>
      <span className=${classString(slots["pagination-link:label"])}>{text}</span>
      <ChevronRightIcon data-icon="inline-end" className=${classString(slots["pagination-link:icon"])} />
    </PaginationLink>
  );
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="pagination-ellipsis" className={cn(${classString(ellipsis)}, className)} {...props}>
      <MoreHorizontalIcon />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
`;
  };
}
