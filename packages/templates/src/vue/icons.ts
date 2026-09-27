import { customIconName, iconSettings, type DesignSystem, type IconLibrary } from "@tesserai/core";
import { ICON_TABLE, LUCIDE_PACKAGES, meaningOf, resolveIcon, type ResolvedIcon } from "../icons";
import type { GeneratedFile } from "../render";

// Icons in the Vue output, with the same meanings as React's applyIcons: templates draw Lucide
// icons by name (ChevronDownIcon, from @lucide/vue), and this pass turns each into the system's
// choice through the libraries' Vue packages. The local name stays, so the templates don't change;
// only the imports do, and for a library drawn through a wrapper (Phosphor with a weight, Hugeicons)
// a small component per icon, in a module-level <script> beside <script setup>.

// Each library's Vue package. Tabler's and Remix's export the React names; Phosphor's prefixes
// them with Ph (PhCaretDown, not CaretDownIcon); Hugeicons draws its icon data (the same
// @hugeicons/core-free-icons) through @hugeicons/vue's HugeiconsIcon.
export const VUE_ICON_PACKAGES: Record<IconLibrary, string> = {
  lucide: LUCIDE_PACKAGES.vue,
  tabler: "@tabler/icons-vue",
  phosphor: "@phosphor-icons/vue",
  hugeicons: "@hugeicons/core-free-icons",
  remix: "@remixicon/vue",
};
const HUGEICONS_VUE = "@hugeicons/vue";

// Phosphor's React name (CaretDownIcon, or CaretDown) as its Vue package exports it: PhCaretDown.
export const phosphorVueName = (react: string) => `Ph${react.replace(/Icon$/, "")}`;

type VueIcon = { kind: "import"; module: string; name: string } | { kind: "wrapper"; imports: [string, string, string][]; body: string } | { kind: "custom"; name: string };

// React's resolution of an icon, in Vue's packages.
function vueIcon(icon: ResolvedIcon, local: string): VueIcon {
  switch (icon.kind) {
    case "custom":
      return { kind: "custom", name: customIconName(icon.id) };
    case "phosphor": {
      const aliased = `Ph${icon.name.replace(/Icon$/, "")}`;
      return { kind: "wrapper", imports: [[VUE_ICON_PACKAGES.phosphor, aliased, aliased]], body: `h(${aliased}, { ...attrs, weight: "${icon.weight}" })` };
    }
    case "hugeicons": {
      const aliased = `Hg${icon.name}`;
      return {
        kind: "wrapper",
        imports: [
          [VUE_ICON_PACKAGES.hugeicons, icon.name, aliased],
          [HUGEICONS_VUE, "HugeiconsIcon", "HugeiconsIcon"],
        ],
        body: `h(HugeiconsIcon, { ...attrs, icon: ${aliased}, strokeWidth: ${icon.stroke} })`,
      };
    }
    case "import": {
      // The React package it came from says which library it is.
      if (icon.module === "lucide-react") return { kind: "import", module: VUE_ICON_PACKAGES.lucide, name: icon.name };
      if (icon.module === "@phosphor-icons/react") return { kind: "import", module: VUE_ICON_PACKAGES.phosphor, name: phosphorVueName(icon.name) };
      if (icon.module === "@tabler/icons-react") return { kind: "import", module: VUE_ICON_PACKAGES.tabler, name: icon.name };
      if (icon.module === "@remixicon/react") return { kind: "import", module: VUE_ICON_PACKAGES.remix, name: icon.name };
      throw new Error(`no Vue package for ${icon.module} (${local})`);
    }
  }
}

const IMPORT = /import\s*\{([^}]*)\}\s*from\s*"@lucide\/vue";?\n?/g;

// Rewrites one generated .vue file's Lucide imports for the system's icons. `component` names the
// component, for spots ("select" for components/ui/select/SelectTrigger.vue).
export function applyVueIcons(source: string, component: string, system: Pick<DesignSystem, "icons">): string {
  const settings = iconSettings(system);
  const names = [...source.matchAll(IMPORT)].flatMap((m) => (m[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean));
  if (names.length === 0) return source;
  const untouched = settings.library === "lucide" && settings.stroke === 2 && Object.keys(settings.spots).every((k) => !k.startsWith(`${component}:`));
  if (untouched) return source;

  const imports = new Map<string, Map<string, string>>();
  const add = (module: string, exported: string, local: string) => {
    if (!imports.has(module)) imports.set(module, new Map());
    imports.get(module)!.set(local, exported);
  };
  const wrapperImports = new Map<string, Map<string, string>>();
  const wrappers: string[] = [];
  for (const local of names) {
    const meaning = meaningOf(local);
    const ref = settings.spots[`${component}:${meaning}`] ?? meaning;
    const icon = vueIcon(resolveIcon(ref, settings), local);
    if (icon.kind === "import") add(icon.module, icon.name, local);
    else if (icon.kind === "custom") add("@/components/icons", icon.name, local);
    else {
      for (const [module, exported, aliased] of icon.imports) {
        if (!wrapperImports.has(module)) wrapperImports.set(module, new Map());
        wrapperImports.get(module)!.set(aliased, exported);
      }
      // Attributes (class, aria-hidden, data-slot) go on the icon's svg, once.
      wrappers.push(`const ${local} = defineComponent({ inheritAttrs: false, setup: (_, { attrs }) => () => ${icon.body} });`);
    }
  }
  const lines = (map: Map<string, Map<string, string>>) =>
    [...map].map(([module, locals]) => `import { ${[...locals].map(([local, exported]) => (local === exported ? local : `${exported} as ${local}`)).sort().join(", ")} } from "${module}";`);

  let first = true;
  let out = source.replace(IMPORT, () => {
    if (!first || imports.size === 0) return "";
    first = false;
    return `${lines(imports).join("\n")}\n`;
  });
  if (wrappers.length > 0) {
    const block = `<script lang="ts">\nimport { defineComponent, h } from "vue";\n${lines(wrapperImports).join("\n")}\n\n// The system's icons, drawn with its weight and stroke.\n${wrappers.join("\n")}\n</script>\n\n`;
    out = out.replace(/<script setup lang="ts">/, `${block}<script setup lang="ts">`);
  }
  return out;
}

// The root attributes of a cleaned SVG, and what's inside it.
function svgParts(svg: string): { attrs: Record<string, string>; inner: string } {
  const open = /^<svg([^>]*?)\/?>/.exec(svg);
  const attrs = Object.fromEntries([...(open?.[1] ?? "").matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]));
  const inner = open === null || open[0].endsWith("/>") ? "" : svg.slice(open[0].length, svg.lastIndexOf("</svg>"));
  return { attrs, inner };
}

// components/icons.ts: one component per icon of the system's own, sized like a 24px icon (wide
// ones keep their width), following the text color unless they have colors of their own. A dark
// version swaps in under .dark. The same icons as React's components/icons.tsx.
export function vueCustomIconsFile(system: Pick<DesignSystem, "icons">): GeneratedFile | null {
  const custom = Object.entries(iconSettings(system).custom);
  if (custom.length === 0) return null;
  const parts = custom.map(([id, icon]) => {
    const name = customIconName(id);
    const box = /viewBox="([^"]+)"/.exec(icon.svg)?.[1]?.split(" ").map(Number) ?? [0, 0, 24, 24];
    const size = { width: String(Math.round((24 * box[2]!) / box[3]!)), height: "24" };
    const light = svgParts(icon.svg);
    const key = (k: string) => (/^[a-z]\w*$/i.test(k) ? k : JSON.stringify(k));
    const draw = (parts: ReturnType<typeof svgParts>, indent: string, className?: string) => {
      const own = Object.entries({ ...parts.attrs, ...size }).map(([k, v]) => `${key(k)}: ${JSON.stringify(v)}`);
      const cls = className === undefined ? [] : [`class: [${JSON.stringify(className)}, attrs["class"]]`];
      return `h("svg", {\n${indent}  ${[...own, "...attrs", ...cls, `innerHTML: ${JSON.stringify(parts.inner)}`].join(`,\n${indent}  `)},\n${indent}})`;
    };
    const body = icon.dark === undefined ? draw(light, "    ") : `[\n      ${draw(light, "      ", "dark:hidden")},\n      ${draw(svgParts(icon.dark), "      ", "hidden dark:block")},\n    ]`;
    return `// ${icon.name.replace(/\n/g, " ")}\nexport const ${name} = defineComponent({\n  name: ${JSON.stringify(name)},\n  inheritAttrs: false,\n  setup: (_, { attrs }) => () =>\n    ${body},\n});`;
  });
  return { path: "components/icons.ts", source: `import { defineComponent, h } from "vue";\n\n${parts.join("\n\n")}\n` };
}

// The icon packages a system's Vue code imports: its library's Vue package, any library a spot
// takes an icon from, and Lucide's for icons its library doesn't map.
export function vueIconPackages(system: Pick<DesignSystem, "icons" | "intents">): string[] {
  const settings = iconSettings(system);
  const packages = new Set<string>([VUE_ICON_PACKAGES[settings.library]]);
  if (settings.library === "hugeicons") packages.add(HUGEICONS_VUE);
  for (const ref of Object.values(settings.spots)) {
    const library = ref.includes(":") && !ref.startsWith("custom:") ? (ref.split(":")[0] as IconLibrary) : null;
    if (library !== null) packages.add(VUE_ICON_PACKAGES[library]);
    if (library === "hugeicons") packages.add(HUGEICONS_VUE);
    if (library === null && !ref.startsWith("custom:") && !(ref in ICON_TABLE)) packages.add(VUE_ICON_PACKAGES.lucide);
  }
  if (settings.library !== "lucide" && Object.values(system.intents).some((i) => i.icon !== undefined && !(i.icon in ICON_TABLE))) packages.add(VUE_ICON_PACKAGES.lucide);
  return [...packages];
}
