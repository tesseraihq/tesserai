import { cssVarName, type Anatomy } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString, cvaSource, unionType } from "./codegen";
import { factorClasses, flatOnly } from "./factor";

const SELECT_BASE = ["w-full", "min-w-0", "appearance-none", "outline-none", "transition-[color,background-color,border-color,box-shadow]", "disabled:pointer-events-none"];
const OPTION = ["bg-[Canvas]", "text-[CanvasText]"];

const padding = () => `var(${cssVarName("native-select.padding-x")})`;

// Where the chevron sits: over the select's end padding, dimmed while the select is disabled.
const iconPlacement = () => [
  "pointer-events-none",
  "absolute",
  "top-1/2",
  "-translate-y-1/2",
  "select-none",
  `end-[${padding()}]`,
  `group-has-[select:disabled]/native-select:opacity-(${cssVarName("opacity.disabled")})`,
];

// Native Select's classes and sizes, which every framework's shell prints from. The chevron sits in
// the select's end padding, which is widened by the icon's size to make room for it.
export function nativeSelectPieces(anatomy: Anatomy, states: StatePrefixes = NATIVE_STATES) {
  const iconSize = `var(${cssVarName("native-select.icon-size")})`;
  const icon = flatOnly(factorClasses(anatomy, "icon", { states }), anatomy.name, "icon");
  return {
    slots: {
      "native-select-wrapper": ["group/native-select", "relative", "w-fit"],
      "native-select": factorClasses(anatomy, "select", { states: { ...states, invalid: ["aria-invalid:"] } }, [...SELECT_BASE, `pe-[calc(${padding()}*1.5+${iconSize})]`]),
      "native-select-icon": [...icon, ...iconPlacement()],
      "native-select-option": OPTION,
      "native-select-optgroup": OPTION,
    },
    sizes: [...(anatomy.axes.size?.enabled ?? [])],
    defaultSize: anatomy.axes.size?.default ?? "md",
  };
}

// A native <select> with a chevron, the same markup on every library (as in shadcn).
export function renderNativeSelect(anatomy: Anatomy): string {
  const { slots, sizes, defaultSize } = nativeSelectPieces(anatomy);
  // The icon's own classes, then its placement, as two strings.
  const icon = slots["native-select-icon"];
  const own = icon.slice(0, icon.length - iconPlacement().length);
  const placement = icon.slice(own.length);
  return `import * as React from "react";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

${cvaSource("nativeSelectVariants", slots["native-select"])}

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: ${unionType(sizes)};
};

// className goes on the wrapper, like shadcn's, so width and margins apply to the whole control.
function NativeSelect({ className, size = ${JSON.stringify(defaultSize)}, ...props }: NativeSelectProps) {
  return (
    <div data-slot="native-select-wrapper" data-size={size} className={cn(${classString(slots["native-select-wrapper"])}, className)}>
      <select data-slot="native-select" data-size={size} className={nativeSelectVariants({ size })} {...props} />
      <ChevronDownIcon
        aria-hidden="true"
        data-slot="native-select-icon"
        className={cn(${classString(own)}, ${classString(placement)})}
      />
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={cn(${classString(slots["native-select-option"])}, className)} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={cn(${classString(slots["native-select-optgroup"])}, className)} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
`;
}
