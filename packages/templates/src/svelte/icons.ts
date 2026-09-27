import { customIconName, iconSettings, type DesignSystem, type IconLibrary, type IconSettings } from "@tesserai/core";
import { ICON_TABLE, LUCIDE_PACKAGES, meaningOf, remixName } from "../icons";
import type { GeneratedFile } from "../render";
import { SVELTE_PLACEHOLDERS } from "./placeholders";
import { mapMarkup } from "./scan";

// Icons in generated Svelte code, with the same meanings as React's pass (../icons.ts): templates
// draw Lucide icons, one default import per icon (`import XIcon from "@lucide/svelte/icons/x"`),
// and this pass turns each into the system's choice. The local name stays, so markup doesn't
// change, except where a library needs something React puts in a one-line wrapper component, which
// Svelte can't declare inline: a Phosphor weight becomes an attribute on each tag, and a Hugeicons
// icon is drawn by <HugeiconsIcon icon={…}>.

// Each library's Svelte 5 package. Tabler's runes build, not @tabler/icons-svelte (Svelte 4 class
// components); remixicon-svelte and phosphor-svelte 3 are runes-based too.
export const SVELTE_ICON_PACKAGES: Record<IconLibrary, string> = {
  lucide: LUCIDE_PACKAGES.svelte,
  tabler: "@tabler/icons-svelte-runes",
  phosphor: "phosphor-svelte",
  hugeicons: "@hugeicons/core-free-icons",
  remix: "remixicon-svelte",
};
const HUGEICONS_SVELTE = "@hugeicons/svelte";

// "ArrowDownS" -> "arrow-down-s"; "Download2Line" -> "download-2-line"; "AB2" -> "a-b-2".
export function pascalToKebab(name: string): string {
  return (name.match(/[A-Z][a-z]*|[a-z]+|[0-9]+/g) ?? []).join("-").toLowerCase();
}

// "IconChevronDown" -> "@tabler/icons-svelte-runes/icons/chevron-down".
export const tablerSveltePath = (name: string) => `${SVELTE_ICON_PACKAGES.tabler}/icons/${pascalToKebab(name.replace(/^Icon/, ""))}`;
// "RiArrowDownSLine" -> "remixicon-svelte/icons/arrow-down-s-line".
export const remixSveltePath = (name: string) => `${SVELTE_ICON_PACKAGES.remix}/icons/${pascalToKebab(name.replace(/^Ri/, ""))}`;
// "CaretDownIcon" -> "phosphor-svelte/lib/CaretDownIcon".
export const phosphorSveltePath = (name: string) => `${SVELTE_ICON_PACKAGES.phosphor}/lib/${name}`;
// "chevron-down" -> "@lucide/svelte/icons/chevron-down".
export const lucideSveltePath = (meaning: string) => `${SVELTE_ICON_PACKAGES.lucide}/icons/${meaning}`;

export type SvelteIcon =
  // A component, default-imported under the name the code uses.
  | { kind: "default"; module: string }
  // Phosphor with a weight other than regular: a component, with the weight on each tag.
  | { kind: "phosphor"; module: string; weight: string }
  // Icon data drawn by <HugeiconsIcon>.
  | { kind: "hugeicons"; name: string; stroke: number }
  | { kind: "custom"; id: string };

// Where an icon comes from in Svelte, for a meaning or a spot's own reference (as resolveIcon).
export function resolveSvelteIcon(ref: string, settings: IconSettings): SvelteIcon {
  if (ref.startsWith("custom:")) return { kind: "custom", id: ref.slice("custom:".length) };
  const colon = ref.indexOf(":");
  const fromLibrary = (library: IconLibrary, name: string): SvelteIcon => {
    switch (library) {
      case "lucide":
        return { kind: "default", module: lucideSveltePath(meaningOf(name)) };
      case "tabler":
        return { kind: "default", module: tablerSveltePath(name) };
      case "phosphor":
        return settings.weight === "regular" ? { kind: "default", module: phosphorSveltePath(name) } : { kind: "phosphor", module: phosphorSveltePath(name), weight: settings.weight };
      case "hugeicons":
        return { kind: "hugeicons", name, stroke: settings.stroke };
      case "remix":
        return { kind: "default", module: remixSveltePath(name) };
    }
  };
  if (colon > 0) return fromLibrary(ref.slice(0, colon) as IconLibrary, ref.slice(colon + 1));
  const row = ICON_TABLE[ref];
  // An icon only Lucide has (a meaning's icon picked by name) stays Lucide's.
  if (settings.library === "lucide" || row === undefined) return { kind: "default", module: lucideSveltePath(ref) };
  switch (settings.library) {
    case "tabler":
      return fromLibrary("tabler", row.tabler);
    case "phosphor":
      return fromLibrary("phosphor", row.phosphor);
    case "hugeicons":
      return fromLibrary("hugeicons", row.hugeicons);
    case "remix":
      return fromLibrary("remix", remixName(row, settings.weight));
  }
}

const LUCIDE_IMPORT = /^([ \t]*)import\s+([A-Za-z_$][\w$]*)\s+from\s+"@lucide\/svelte\/icons\/[a-z0-9-]+";?[ \t]*\r?\n?/gm;
const escapeRegExp = (text: string) => text.replace(/[$^\\.*+?()[\]{}|]/g, "\\$&");

// Rewrites one generated .svelte file's Lucide imports (and, where the library needs it, the tags
// that draw them) for the system's icons. `component` names the file for spots ("dialog" for
// components/ui/dialog/dialog-content.svelte). Lucide with no spots here leaves the file as it is.
export function applySvelteIcons(source: string, component: string, system: Pick<DesignSystem, "icons">): string {
  const settings = iconSettings(system);
  const found = [...source.matchAll(LUCIDE_IMPORT)];
  if (found.length === 0) return source;
  if (settings.library === "lucide" && Object.keys(settings.spots).every((k) => !k.startsWith(`${component}:`))) return source;

  const defaults: string[] = [];
  const named = new Map<string, Map<string, string>>();
  const addNamed = (module: string, exported: string, local: string) => {
    if (!named.has(module)) named.set(module, new Map());
    named.get(module)!.set(local, exported);
  };
  // Tags that change: the opening tag's head, and what closes it.
  const tags = new Map<string, { open: string; close: string }>();
  // Type positions that name an icon with no component of its own (Hugeicons).
  const types = new Map<string, { props: string; type: string }>();
  for (const m of found) {
    const local = m[2]!;
    const meaning = meaningOf(local);
    const icon = resolveSvelteIcon(settings.spots[`${component}:${meaning}`] ?? meaning, settings);
    switch (icon.kind) {
      case "default":
        defaults.push(`import ${local} from "${icon.module}";`);
        break;
      case "phosphor":
        defaults.push(`import ${local} from "${icon.module}";`);
        tags.set(local, { open: `<${local} weight="${icon.weight}"`, close: `</${local}>` });
        break;
      case "custom":
        addNamed(`${SVELTE_PLACEHOLDERS.components}/icons/index.js`, customIconName(icon.id), local);
        break;
      case "hugeicons": {
        const aliased = `Hg${icon.name}`;
        addNamed(SVELTE_ICON_PACKAGES.hugeicons, icon.name, aliased);
        addNamed(HUGEICONS_SVELTE, "HugeiconsIcon", "HugeiconsIcon");
        tags.set(local, { open: `<HugeiconsIcon icon={${aliased}} strokeWidth={${icon.stroke}}`, close: "</HugeiconsIcon>" });
        types.set(local, { props: `Omit<ComponentProps<typeof HugeiconsIcon>, "icon">`, type: "typeof HugeiconsIcon" });
        break;
      }
    }
  }
  const indent = found[0]![1]!;
  const lines = [
    ...defaults,
    ...[...named].map(([module, locals]) => {
      const specifiers = [...locals].map(([local, exported]) => (local === exported ? local : `${exported} as ${local}`)).sort();
      return `import { ${specifiers.join(", ")} } from "${module}";`;
    }),
  ];

  let out = source;
  if (tags.size > 0) {
    out = mapMarkup(out, (markup) => {
      let edited = markup;
      for (const [local, tag] of tags) {
        const name = escapeRegExp(local);
        edited = edited.replace(new RegExp(`<${name}(?=[\\s/>])`, "g"), tag.open).replace(new RegExp(`</${name}\\s*>`, "g"), tag.close);
      }
      return edited;
    });
  }
  // A type that names the icon (ComponentProps<typeof Loader2Icon>, for a component that takes the
  // icon's props) names what now draws it.
  for (const [local, type] of types) {
    const name = escapeRegExp(local);
    out = out.replace(new RegExp(`ComponentProps<\\s*typeof\\s+${name}\\s*>`, "g"), type.props).replace(new RegExp(`\\btypeof\\s+${name}\\b`, "g"), type.type);
  }
  // The new imports go where the first Lucide import was.
  let first = true;
  return out.replace(LUCIDE_IMPORT, () => {
    if (!first) return "";
    first = false;
    return lines.map((line) => `${indent}${line}\n`).join("");
  });
}

// The icon packages a system's Svelte code imports (as iconPackages for React): its library, any
// library a spot takes an icon from, and Lucide for icons its library doesn't map.
export function svelteIconPackages(system: Pick<DesignSystem, "icons" | "intents">): string[] {
  const settings = iconSettings(system);
  const packages = new Set<string>();
  const add = (library: IconLibrary) => {
    if (library === "hugeicons") packages.add(HUGEICONS_SVELTE);
    packages.add(SVELTE_ICON_PACKAGES[library]);
  };
  add(settings.library);
  for (const ref of Object.values(settings.spots)) {
    if (ref.startsWith("custom:")) continue;
    if (ref.includes(":")) add(ref.split(":")[0] as IconLibrary);
    else if (!(ref in ICON_TABLE)) add("lucide");
  }
  if (settings.library !== "lucide" && Object.values(system.intents).some((i) => i.icon !== undefined && !(i.icon in ICON_TABLE))) add("lucide");
  return [...packages];
}

// Braces in an attribute value would start a Svelte expression; as character references they're text.
const escapeBraces = (svg: string) => svg.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");

// A cleaned SVG as Svelte markup (its attributes as they are: SVG's own kebab-case), with the
// component's size and props on the root.
function svgMarkup(svg: string, extra: string): string {
  return escapeBraces(svg).replace(/^<svg([^>]*?)(\/?)>/, (_, attrs: string, close: string) => `<svg${attrs} ${extra}${close}>`);
}

// One of the system's own icons as a Svelte component, sized like a 24px icon (wide ones keep their
// width), taking `class` and any other SVG attribute. A dark version swaps in under .dark.
function customIconSource(icon: IconSettings["custom"][string]): string {
  const box = /viewBox="([^"]+)"/.exec(icon.svg)?.[1]?.split(" ").map(Number) ?? [0, 0, 24, 24];
  const size = `width={${Math.round((24 * box[2]!) / box[3]!)}} height={24}`;
  const dark = icon.dark !== undefined;
  const script = [
    // The name as a comment; `</` escaped so it can't close the script.
    `  // ${icon.name.replace(/\s+/g, " ").replace(/<\//g, "<\\/")}`,
    `  import type { SVGAttributes } from "svelte/elements";`,
    ...(dark ? [`  import { cn } from "${SVELTE_PLACEHOLDERS.utils}.js";`, "", `  const lightClasses = "dark:hidden";`, `  const darkClasses = "hidden dark:block";`] : []),
    "",
    "  let { class: className, ...restProps }: SVGAttributes<SVGSVGElement> = $props();",
  ];
  const markup = dark
    ? `${svgMarkup(icon.svg, `${size} class={cn(lightClasses, className)} {...restProps}`)}\n${svgMarkup(icon.dark!, `${size} class={cn(darkClasses, className)} {...restProps}`)}`
    : svgMarkup(icon.svg, `${size} class={className} {...restProps}`);
  return `<script lang="ts">\n${script.join("\n")}\n</script>\n\n${markup}\n`;
}

// The system's own icons for Svelte (the counterpart of customIconsFile): components/icons/<id>.svelte
// for each, and components/icons/index.ts exporting them by name (AcmeLogoIcon).
export function svelteCustomIconFiles(system: Pick<DesignSystem, "icons">): GeneratedFile[] {
  const custom = Object.entries(iconSettings(system).custom);
  if (custom.length === 0) return [];
  const index = custom.map(([id]) => `export { default as ${customIconName(id)} } from "./${id}.svelte";`).join("\n");
  return [...custom.map(([id, icon]) => ({ path: `components/icons/${id}.svelte`, source: customIconSource(icon) })), { path: "components/icons/index.ts", source: `${index}\n` }];
}
