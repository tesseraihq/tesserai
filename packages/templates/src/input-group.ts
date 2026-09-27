import { cssVarName, type Anatomy, type Base } from "@tesserai/core";
import { mapStates, NATIVE_STATES, type StatePrefixes } from "./classes";
import type { LocalCva } from "./display";
import { classString } from "./codegen";
import { flatClasses } from "./factor";
import { LABEL_TRUNCATES, SHRINKS, TEXT_IN_SPAN } from "./label";
import { RAC_STATES } from "./react-aria/states";

const NONE = mapStates(() => []);

// The group shows the state of the control inside it: focus and invalid come from the control.
const GROUP_STATES: StatePrefixes = {
  ...NONE,
  hover: ["hover:"],
  "focus-visible": ["has-[[data-slot=input-group-control]:focus-visible]:"],
  invalid: ["has-[[data-slot][aria-invalid=true]]:"],
  disabled: ["data-[disabled=true]:"],
};

const ADDON_ALIGN = {
  "inline-start": "order-first",
  "inline-end": "order-last",
  "block-start": "order-first w-full justify-start pt-2",
  "block-end": "order-last w-full justify-start pb-2",
};

type Pieces = { imports: string; input: string; inputProps: string; textarea: string; textareaProps: string; button: string; buttonProps: string; buttonStates: StatePrefixes; controlStates: StatePrefixes };

const PIECES: Record<Base, Pieces> = {
  "base-ui": {
    imports: `import { Button as ButtonPrimitive } from "@base-ui/react/button";\nimport { Input as InputPrimitive } from "@base-ui/react/input";`,
    input: "InputPrimitive",
    inputProps: `Omit<React.ComponentProps<typeof InputPrimitive>, "className"> & { className?: string }`,
    textarea: "textarea",
    textareaProps: `React.ComponentProps<"textarea">`,
    button: "ButtonPrimitive",
    buttonProps: `Omit<React.ComponentProps<typeof ButtonPrimitive>, "className"> & { className?: string }`,
    buttonStates: { ...NATIVE_STATES, disabled: ["disabled:", "data-disabled:"] },
    controlStates: NATIVE_STATES,
  },
  radix: {
    imports: "",
    input: "input",
    inputProps: `React.ComponentProps<"input">`,
    textarea: "textarea",
    textareaProps: `React.ComponentProps<"textarea">`,
    button: "button",
    buttonProps: `React.ComponentProps<"button">`,
    buttonStates: NATIVE_STATES,
    controlStates: NATIVE_STATES,
  },
  "react-aria": {
    imports: `import { Button as ButtonPrimitive, Group, Input as InputPrimitive, TextArea as TextAreaPrimitive, type ButtonProps, type GroupProps, type InputProps, type TextAreaProps } from "react-aria-components";`,
    input: "InputPrimitive",
    inputProps: `Omit<InputProps, "className"> & { className?: string }`,
    textarea: "TextAreaPrimitive",
    textareaProps: `Omit<TextAreaProps, "className"> & { className?: string }`,
    button: "ButtonPrimitive",
    buttonProps: `Omit<ButtonProps, "className"> & { className?: string }`,
    buttonStates: RAC_STATES,
    controlStates: RAC_STATES,
  },
};

// Input Group's classes, which every framework's shell prints from: the group reads its control's
// state; the addon is a cva by where it sits, the button one by size. The control's classes serve
// the input and the textarea alike (the textarea adds its own two).
export function inputGroupPieces(anatomy: Anatomy, { button: buttonStates = NATIVE_STATES, control: controlStates = NATIVE_STATES }: { button?: StatePrefixes; control?: StatePrefixes } = {}) {
  const part = (name: string, states: StatePrefixes, extra: string[] = [], prefix?: string) => flatClasses(anatomy, name, prefix === undefined ? { states } : { states, prefix }, extra);
  const control = [
    ...part("control", controlStates, ["flex-1", "min-w-0", "self-stretch", "bg-transparent", "outline-none", "border-0", "shadow-none"]),
    ...part("placeholder", controlStates, [], "placeholder:"),
    // Beside an addon the control needs only a little padding on that side.
    `group-has-[>[data-align=inline-start]]/input-group:ps-1`,
    `group-has-[>[data-align=inline-end]]/input-group:pe-1`,
  ];
  const h = (size: string) => `var(${cssVarName(`input-group.button.${size}`)})`;
  const addon: LocalCva = {
    base: part("addon", NONE, ["flex", "min-w-0", "h-auto", "cursor-text", "items-center", "justify-center", "select-none", "[&>svg]:size-4", "[&>svg]:shrink-0", "group-data-[disabled=true]/input-group:opacity-50"]),
    variants: { align: Object.fromEntries(Object.entries(ADDON_ALIGN).map(([align, classes]) => [align, classes.split(" ")])) },
    compoundVariants: [],
    defaultVariants: { align: "inline-start" },
  };
  const button: LocalCva = {
    base: part("button", buttonStates, ["flex", ...SHRINKS, "items-center", "justify-center", "gap-1", "whitespace-nowrap", ...LABEL_TRUNCATES, "outline-none", "[&_svg]:pointer-events-none", "[&_svg]:shrink-0", "[&_svg]:size-3.5"]),
    variants: { size: { xs: [`h-[${h("xs")}]`], sm: [`h-[${h("sm")}]`], "icon-xs": [`size-[${h("xs")}]`, "shrink-0", "px-0"], "icon-sm": [`size-[${h("sm")}]`, "shrink-0", "px-0"] } },
    compoundVariants: [],
    defaultVariants: { size: "xs" },
  };
  return {
    slots: {
      "input-group": part("root", GROUP_STATES, [
        "group/input-group",
        "relative",
        "flex",
        "w-full",
        "min-w-0",
        "items-center",
        "outline-none",
        "transition-[color,background-color,border-color,box-shadow,opacity]",
        "has-[>textarea]:h-auto",
        "has-[>[data-align=block-start]]:flex-col",
        "has-[>[data-align=block-end]]:flex-col",
        "has-[>[data-align=block-start]]:h-auto",
        "has-[>[data-align=block-end]]:h-auto",
      ]),
      "input-group-addon": addon,
      "input-group-button": button,
      "input-group-control": control,
      "input-group-control:textarea": [...control, "resize-none", "py-2"],
      // InputGroupText has no data-slot of its own; it sits in an addon.
      "input-group-addon:text": ["flex", "items-center", "gap-2", "[&_svg]:pointer-events-none"],
    },
  };
}

// A local cva's variants as the React file writes them: each value one class string.
const joined = (values: Record<string, string[]>) => JSON.stringify(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.join(" ")])));

// Input Group is shadcn's structure on each library's own input and button. Its control and button
// are parts of this component rather than Input and Button, because inside a group they are bare
// (no border, smaller); restyling them by overriding Input's classes would fight tailwind-merge.
export function inputGroupTemplate(base: Base) {
  const p = PIECES[base];
  return (anatomy: Anatomy): string => {
    const { slots } = inputGroupPieces(anatomy, { button: p.buttonStates, control: p.controlStates });
    const root = classString(slots["input-group"]);
    const control = slots["input-group-control"];
    const addonCva = slots["input-group-addon"];
    const buttonCva = slots["input-group-button"];
    const addon = classString(addonCva.base);
    const button = buttonCva.base;
    const Root = base === "react-aria" ? "Group" : "div";
    const rootProps = base === "react-aria" ? `Omit<GroupProps, "className"> & { className?: string }` : `React.ComponentProps<"div">`;
    const role = base === "react-aria" ? "" : ` role="group"`;
    const textareaExtra = classString(slots["input-group-control:textarea"].slice(control.length));
    return `import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
${p.imports}
import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }: ${rootProps}) {
  return <${Root} data-slot="input-group"${role} className={cn(${root}, className)} {...props} />;
}

const inputGroupAddonVariants = cva(${addon}, {
  variants: { align: ${joined(addonCva.variants["align"]!)} },
  defaultVariants: { align: "inline-start" },
});

// Clicking an addon (outside a button in it) focuses the control, as clicking a label would.
function InputGroupAddon({ className, align = "inline-start", ...props }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("button") !== null) return;
        const control = event.currentTarget.parentElement?.querySelector("input, textarea");
        if (control instanceof HTMLElement) control.focus();
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva(${classString(button)}, {
  variants: { size: ${joined(buttonCva.variants["size"]!)} },
  defaultVariants: { size: "xs" },
});

${TEXT_IN_SPAN}

function InputGroupButton({ className, size = "xs", type = "button", children, ...props }: ${p.buttonProps} & VariantProps<typeof inputGroupButtonVariants> & { type?: "button" | "submit" | "reset" }) {
  return (
    <${p.button} type={type} data-slot="input-group-button" data-size={size} className={cn(inputGroupButtonVariants({ size }), className)} {...props}>
      {label(children)}
    </${p.button}>
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn(${classString(slots["input-group-addon:text"])}, className)} {...props} />;
}

function InputGroupInput({ className, ...props }: ${p.inputProps}) {
  return <${p.input} data-slot="input-group-control" className={cn(${classString(control)}, className)} {...props} />;
}

function InputGroupTextarea({ className, ...props }: ${p.textareaProps}) {
  return <${p.textarea} data-slot="input-group-control" className={cn(${classString(control)}, ${textareaExtra}, className)} {...props} />;
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea };
`;
  };
}
