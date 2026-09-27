import { type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

const NONE = mapStates(() => []);
const DISABLED_IN_FIELD: StatePrefixes = { ...NONE, disabled: ["group-data-[disabled=true]/field:"] };

// Layout from shadcn's Field; colours, type and spacing come from the recipe.
const ORIENTATION = {
  vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
  horizontal:
    "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
  responsive:
    "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
};
export type FieldOrientation = keyof typeof ORIENTATION;

// Field's classes, which every framework's shell prints from. Field itself is a cva by orientation
// (a layout prop, not a design axis); FieldTitle shares FieldLabel's data-slot, so its classes are
// "field-label:title". checked is how a checked control is detected (Radix's by default).
export function fieldPieces(anatomy: Anatomy, checked: string[] = ["has-data-[state=checked]:"]) {
  const part = (name: string, states: StatePrefixes, extra: string[] = [], prefix?: string) =>
    flatClasses(anatomy, name, prefix === undefined ? { states } : { states, prefix }, extra);
  const choiceStates: StatePrefixes = { ...NONE, hover: ["hover:"], selected: checked, "focus-visible": ["has-[:focus-visible]:"] };
  const choice = part("choice", choiceStates, ["has-[>[data-slot=field]]:w-full", "has-[>[data-slot=field]]:flex-col", `*:data-[slot=field]:p-(--field-choice-padding)`], "has-[>[data-slot=field]]:");
  const orientation = Object.fromEntries(Object.entries(ORIENTATION).map(([name, classes]) => [name, classes.split(" ")])) as Record<FieldOrientation, string[]>;
  return {
    slots: {
      "field-set": part("set", NONE, ["flex", "flex-col"]),
      "field-legend": part("legend", NONE, ["mb-3"]),
      "field-group": part("group", NONE, ["group/field-group", "@container/field-group", "flex", "w-full", "flex-col"]),
      field: {
        base: part("root", { ...NONE, invalid: ["data-[invalid=true]:"] }, ["group/field", "flex", "w-full"]),
        variants: { orientation },
        compoundVariants: [],
        defaultVariants: { orientation: "vertical" as FieldOrientation },
      },
      "field-content": part("content", NONE, ["group/field-content", "flex", "flex-1", "flex-col", "leading-snug"]),
      "field-label": [...part("label", DISABLED_IN_FIELD, ["group/field-label", "peer/field-label", "flex", "w-fit", "leading-snug"]), ...choice],
      "field-label:title": part("title", DISABLED_IN_FIELD, ["flex", "w-fit", "items-center", "leading-snug"]),
      "field-description": part("description", NONE, ["leading-normal", "font-normal", "text-start", "group-has-data-[orientation=horizontal]/field:text-balance", "last:mt-0", "nth-last-2:-mt-1", "[&>a]:underline", "[&>a]:underline-offset-4"]),
      "field-separator": ["relative", "-my-2", "h-5"],
      // The rule itself, an aria-hidden div inside the separator.
      "field-separator:line": part("separator", NONE, ["absolute", "inset-x-0", "top-1/2", "h-px"]),
      "field-separator-content": part("separator-label", NONE, ["relative", "mx-auto", "block", "w-fit", "max-w-full", "truncate"]),
      "field-error": part("error", NONE, ["font-normal"]),
      // The list several errors are shown in.
      "field-error:list": ["ms-4", "flex", "list-disc", "flex-col", "gap-1"],
    },
  };
}

// Field is the same markup on every library (as in shadcn); only how a checked control inside a
// choice card is detected differs: data-checked (Base UI), data-state=checked (Radix),
// data-selected (React Aria).
export function fieldTemplate(checked: string[]) {
  return (anatomy: Anatomy): string => {
    const { slots } = fieldPieces(anatomy, checked);
    const orientation = JSON.stringify(Object.fromEntries(Object.entries(slots.field.variants.orientation).map(([name, classes]) => [name, classes.join(" ")])));
    return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn(${classString(slots["field-set"])}, className)} {...props} />;
}

function FieldLegend({ className, variant = "legend", ...props }: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn(${classString(slots["field-legend"])}, className)} {...props} />;
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn(${classString(slots["field-group"])}, className)} {...props} />;
}

const fieldVariants = cva(${classString(slots.field.base)}, {
  variants: { orientation: ${orientation} },
  defaultVariants: { orientation: "vertical" },
});

function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />;
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-content" className={cn(${classString(slots["field-content"])}, className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" className={cn(${classString(slots["field-label"])}, className)} {...props} />;
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-label" className={cn(${classString(slots["field-label:title"])}, className)} {...props} />;
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(${classString(slots["field-description"])}, className)}
      {...props}
    />
  );
}

function FieldSeparator({ children, className, ...props }: React.ComponentProps<"div"> & { children?: React.ReactNode }) {
  return (
    <div data-slot="field-separator" data-content={children !== undefined && children !== null} className={cn(${classString(slots["field-separator"])}, className)} {...props}>
      <div aria-hidden="true" className={${classString(slots["field-separator:line"])}} />
      {children !== undefined && children !== null ? (
        <span data-slot="field-separator-content" className={${classString(slots["field-separator-content"])}}>
          {children}
        </span>
      ) : null}
    </div>
  );
}

function FieldError({ className, children, errors, ...props }: React.ComponentProps<"div"> & { errors?: Array<{ message?: string } | undefined> }) {
  const content = React.useMemo(() => {
    if (children !== undefined && children !== null) return children;
    if (errors === undefined || errors.length === 0) return null;
    const unique = [...new Map(errors.map((error) => [error?.message, error])).values()];
    if (unique.length === 1) return unique[0]?.message ?? null;
    return (
      <ul className=${classString(slots["field-error:list"])}>
        {unique.map((error, index) => (error?.message ? <li key={index}>{error.message}</li> : null))}
      </ul>
    );
  }, [children, errors]);
  if (content === null || content === undefined) return null;
  return (
    <div role="alert" data-slot="field-error" className={cn(${classString(slots["field-error"])}, className)} {...props}>
      {content}
    </div>
  );
}

export { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle };
`;
  };
}
