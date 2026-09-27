import type { Anatomy } from "@tesserai/core";
import type { StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatOnly, type CvaConfig } from "./factor";
import { lucideName, type TemplateContext } from "./render";

const ROOT_BASE = ["relative", "grid", "grid-cols-[auto_1fr_auto_auto]", "items-start", "transition-[opacity,transform]"];

export type ToastPieces = {
  // cva configs, the Intent type and helpers, and the per-intent icons.
  prelude: string;
  iconImports: string[];
  title: string;
  description: string;
  action: string;
  close: string;
};

// What every library's Toast shares, as data for any framework's shell: the root's and the icon's
// cva (by intent), the flat parts' classes, the intents with the default one, and each intent's
// icon (a Lucide name), so meaning never relies on color alone.
export function toastParts(anatomy: Anatomy, context: TemplateContext, states: StatePrefixes, rootExtra: string[]) {
  const opts = { states };
  const flat = (part: string, extra: string[] = []) => flatOnly(factorClasses(anatomy, part, opts, extra), anatomy.name, part);
  const intents = anatomy.axes.intent?.enabled ?? [];
  return {
    root: factorClasses(anatomy, "root", opts, [...ROOT_BASE, ...rootExtra]) as CvaConfig,
    icon: factorClasses(anatomy, "icon", opts, ["mt-0.5", "[&_svg]:size-4"]) as CvaConfig,
    title: flat("title"),
    description: flat("description"),
    action: flat("action", ["inline-flex", "shrink-0", "items-center", "justify-center", "self-center", "whitespace-nowrap", "outline-none", "transition-colors"]),
    close: flat("close", ["inline-flex", "size-6", "items-center", "justify-center", "outline-none", "[&_svg]:size-4"]),
    intents,
    defaultIntent: anatomy.axes.intent?.default ?? intents[0] ?? "neutral",
    icons: intents.map((intent) => [intent, context.intents[intent]?.icon] as const).filter((pair): pair is readonly [string, string] => pair[1] !== undefined),
  };
}

// One toast per intent (toast.add({ type: "success" })), each with an icon, and the same parts in
// every library, as React source.
export function toastPieces(anatomy: Anatomy, context: TemplateContext, states: StatePrefixes, rootExtra: string[]): ToastPieces {
  const p = toastParts(anatomy, context, states, rootExtra);
  const { intents, defaultIntent, icons } = p;

  const prelude = `${cvaSource("toastVariants", p.root)}
${cvaSource("toastIconVariants", p.icon)}

type Intent = ${unionType(intents)};
const INTENTS: readonly Intent[] = [${intents.map(q).join(", ")}];

const icons: Partial<Record<Intent, React.ElementType>> = {
${icons.map(([intent, name]) => `  ${q(intent)}: ${lucideName(name)},`).join("\n")}
};

// A toast's type names its intent; anything else is ${defaultIntent}.
function intentOf(type: string | undefined): Intent {
  return INTENTS.find((intent) => intent === type) ?? ${q(defaultIntent)};
}`;

  return {
    prelude,
    iconImports: [...new Set(icons.map(([, name]) => lucideName(name)))],
    title: classString(p.title),
    description: classString(p.description),
    action: classString(p.action),
    close: classString(p.close),
  };
}
