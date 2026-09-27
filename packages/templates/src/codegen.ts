import type { Selection } from "@tesserai/core";
import type { CvaConfig } from "./factor";

export const q = (s: string) => JSON.stringify(s);
export const classString = (classes: string[]) => q(classes.join(" "));

export function cvaSource(name: string, config: CvaConfig): string {
  const variants = Object.entries(config.variants)
    .map(([axis, values]) => {
      const entries = Object.entries(values)
        .map(([value, classes]) => `${q(value)}: ${classString(classes)}`)
        .join(",\n");
      return `${axis}: {\n${entries}\n}`;
    })
    .join(",\n");
  const pairs = (selection: Selection) =>
    Object.entries(selection)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([axis, value]) => `${axis}: ${q(value)}`)
      .join(", ");
  const compound = config.compoundVariants
    .map(({ selection, classes }) => `{ ${pairs(selection)}, class: ${classString(classes)} }`)
    .join(",\n");
  const defaults = pairs(config.defaultVariants);

  return `const ${name} = cva(${classString(config.base)}, {
  variants: {\n${variants}\n},
  compoundVariants: [\n${compound}\n],
  defaultVariants: { ${defaults} },
});`;
}

export function unionType(values: readonly string[]): string {
  return values.map(q).join(" | ");
}

export function selectionKeys(selection: Selection): string {
  return Object.keys(selection).join(",");
}
