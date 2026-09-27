import { BASES, flattenTokens, includedComponents, type Anatomy, type Base, type DesignSystem, type Framework, type IntentDef } from "@tesserai/core";
import { VUE_TEMPLATES } from "./vue";
import { SVELTE_TEMPLATES } from "./svelte";
import { svelteUtilsSource } from "./svelte/utils";
import { applyVueIcons, vueCustomIconsFile, vueIconPackages } from "./vue/icons";
import { applySvelteIcons, svelteCustomIconFiles, svelteIconPackages } from "./svelte/icons";
import { applyIcons, customIconsFile, iconPackages } from "./icons";
import { badgeTemplate } from "./badge";
import { renderSonner } from "./sonner";
import { renderResizable } from "./resizable";
import { carouselTemplate } from "./carousel";
import { renderChart } from "./chart";
import { calendarTemplate } from "./calendar";
import { datePickerTemplate } from "./date-picker";
import { dataTableTemplate } from "./data-table";
import { sidebarTemplate } from "./sidebar";
import { directionTemplate } from "./direction";
import { attachmentTemplate, bubbleTemplate, markerTemplate, renderMessage, renderMessageScroller, renderQuestionnaire } from "./chat";
import { accordionTemplate, collapsibleTemplate } from "./disclosure";
import { breadcrumbTemplate } from "./breadcrumb";
import { paginationTemplate } from "./pagination";
import { scrollAreaTemplate } from "./scroll-area";
import { navigationMenuTemplate } from "./navigation-menu";
import { aspectRatioTemplate, avatarTemplate, buttonGroupTemplate, itemTemplate, progressTemplate, renderAlert, renderEmpty, renderKbd, renderSkeleton, renderSpinner, renderTypography, separatorTemplate } from "./display";
import { renderButton } from "./base-ui/button";
import { renderCard } from "./base-ui/card";
import { renderCheckbox } from "./base-ui/checkbox";
import { renderDialog } from "./base-ui/dialog";
import { renderDropdownMenu } from "./base-ui/dropdown-menu";
import { renderInput } from "./base-ui/input";
import { renderSelect } from "./base-ui/select";
import { renderTable } from "./base-ui/table";
import { renderAriaTable } from "./react-aria/table";
import { renderTabs } from "./base-ui/tabs";
import { renderToast } from "./base-ui/toast";
import { renderTooltip } from "./base-ui/tooltip";
import { renderLabel } from "./base-ui/label";
import { renderRadioGroup } from "./base-ui/radio-group";
import { renderSlider } from "./base-ui/slider";
import { renderSwitch } from "./base-ui/switch";
import { renderToggle } from "./base-ui/toggle";
import { renderToggleGroup } from "./base-ui/toggle-group";
import { renderToggle as renderRadixToggle } from "./radix/toggle";
import { renderToggleGroup as renderRadixToggleGroup } from "./radix/toggle-group";
import { renderToggle as renderAriaToggle } from "./react-aria/toggle";
import { renderToggleGroup as renderAriaToggleGroup } from "./react-aria/toggle-group";
import { renderRadioGroup as renderRadixRadioGroup } from "./radix/radio-group";
import { renderSlider as renderRadixSlider } from "./radix/slider";
import { renderSwitch as renderRadixSwitch } from "./radix/switch";
import { renderRadioGroup as renderAriaRadioGroup } from "./react-aria/radio-group";
import { renderSlider as renderAriaSlider } from "./react-aria/slider";
import { renderSwitch as renderAriaSwitch } from "./react-aria/switch";
import { renderTextarea } from "./base-ui/textarea";
import { fieldTemplate } from "./field";
import { renderPopover } from "./base-ui/popover";
import { renderHoverCard } from "./base-ui/hover-card";
import { renderAlertDialog } from "./base-ui/alert-dialog";
import { renderSheet } from "./base-ui/sheet";
import { renderContextMenu } from "./base-ui/context-menu";
import { renderMenubar } from "./base-ui/menubar";
import { renderPopover as renderRadixPopover } from "./radix/popover";
import { renderHoverCard as renderRadixHoverCard } from "./radix/hover-card";
import { renderAlertDialog as renderRadixAlertDialog } from "./radix/alert-dialog";
import { renderSheet as renderRadixSheet } from "./radix/sheet";
import { renderContextMenu as renderRadixContextMenu } from "./radix/context-menu";
import { renderMenubar as renderRadixMenubar } from "./radix/menubar";
import { renderPopover as renderAriaPopover } from "./react-aria/popover";
import { renderHoverCard as renderAriaHoverCard } from "./react-aria/hover-card";
import { renderAlertDialog as renderAriaAlertDialog } from "./react-aria/alert-dialog";
import { renderSheet as renderAriaSheet } from "./react-aria/sheet";
import { renderContextMenu as renderAriaContextMenu } from "./react-aria/context-menu";
import { renderMenubar as renderAriaMenubar } from "./react-aria/menubar";
import { renderDrawer } from "./base-ui/drawer";
import { renderDrawer as renderRadixDrawer } from "./radix/drawer";
import { renderAriaCombobox, renderBaseCombobox } from "./combobox";
import { renderAriaCommand, renderCmdkCommand } from "./command";
import { formatSource, formatTsx } from "./format";
import { inputGroupTemplate } from "./input-group";
import { renderInputOtp } from "./input-otp";
import { renderNativeSelect } from "./native-select";
import { renderLabel as renderRadixLabel } from "./radix/label";
import { renderLabel as renderAriaLabel } from "./react-aria/label";
import { renderTextarea as renderAriaTextarea } from "./react-aria/textarea";
import { renderButton as renderRadixButton } from "./radix/button";
import { renderCheckbox as renderRadixCheckbox } from "./radix/checkbox";
import { renderDialog as renderRadixDialog } from "./radix/dialog";
import { renderDropdownMenu as renderRadixDropdownMenu } from "./radix/dropdown-menu";
import { renderInput as renderRadixInput } from "./radix/input";
import { renderSelect as renderRadixSelect } from "./radix/select";
import { renderTabs as renderRadixTabs } from "./radix/tabs";
import { renderToast as renderRadixToast } from "./radix/toast";
import { renderTooltip as renderRadixTooltip } from "./radix/tooltip";
import { renderButton as renderAriaButton } from "./react-aria/button";
import { renderCheckbox as renderAriaCheckbox } from "./react-aria/checkbox";
import { renderDialog as renderAriaDialog } from "./react-aria/dialog";
import { renderDropdownMenu as renderAriaDropdownMenu } from "./react-aria/dropdown-menu";
import { renderInput as renderAriaInput } from "./react-aria/input";
import { renderSelect as renderAriaSelect } from "./react-aria/select";
import { renderTabs as renderAriaTabs } from "./react-aria/tabs";
import { renderToast as renderAriaToast } from "./react-aria/toast";
import { renderTooltip as renderAriaTooltip } from "./react-aria/tooltip";

export { BASES };
export type { Base };

// What the code is generated for: a React library (a Base), or Vue on Reka UI, or Svelte on Bits
// UI. A codegen key only: a system stores its framework and its React base (see docs/frameworks).
export const TARGETS = [...BASES, "reka-ui", "bits-ui"] as const;
export type Target = (typeof TARGETS)[number];
export const targetFramework = (target: Target): Framework => (target === "reka-ui" ? "vue" : target === "bits-ui" ? "svelte" : "react");
// The target for a framework: React keeps the system's library; Vue and Svelte have one each.
export const targetFor = (framework: Framework, base: Base): Target => (framework === "vue" ? "reka-ui" : framework === "svelte" ? "bits-ui" : base);
const isReact = (target: Target): target is Base => targetFramework(target) === "react";

export type TemplateContext = { intents: Record<string, IntentDef> };
export type Template = (anatomy: Anatomy, context: TemplateContext) => string;
// A Vue or Svelte component is a folder of files (Button.vue, index.ts…), as in shadcn-vue and
// shadcn-svelte; paths are relative to components/ui ("button/Button.vue").
export type FilesTemplate = (anatomy: Anatomy, context: TemplateContext) => GeneratedFile[];

// Purely visual components are the same markup on every base.
const VISUAL: Record<string, Template> = {
  card: renderCard,
  "native-select": renderNativeSelect,
  // input-otp on every library, as in shadcn.
  "input-otp": renderInputOtp,
  // Sonner on every library, as in shadcn.
  sonner: renderSonner,
  alert: renderAlert,
  skeleton: renderSkeleton,
  spinner: renderSpinner,
  kbd: renderKbd,
  empty: renderEmpty,
  typography: renderTypography,
  resizable: renderResizable,
  chart: renderChart,
  message: renderMessage,
  "message-scroller": renderMessageScroller,
  questionnaire: renderQuestionnaire,
};

const BASE_UI: Record<string, Template> = {
  ...VISUAL,
  accordion: accordionTemplate("base-ui"),
  collapsible: collapsibleTemplate("base-ui"),
  breadcrumb: breadcrumbTemplate("base-ui"),
  pagination: paginationTemplate("base-ui"),
  "scroll-area": scrollAreaTemplate("base-ui"),
  separator: separatorTemplate("base-ui"),
  carousel: carouselTemplate("base-ui"),
  calendar: calendarTemplate("base-ui"),
  "date-picker": datePickerTemplate("base-ui"),
  "data-table": dataTableTemplate("base-ui"),
  bubble: bubbleTemplate("base-ui"),
  attachment: attachmentTemplate("base-ui"),
  marker: markerTemplate("base-ui"),
  sidebar: sidebarTemplate("base-ui"),
  direction: directionTemplate("base-ui"),
  "aspect-ratio": aspectRatioTemplate("base-ui"),
  avatar: avatarTemplate("base-ui"),
  progress: progressTemplate("base-ui"),
  item: itemTemplate("base-ui"),
  "button-group": buttonGroupTemplate("base-ui"),
  "navigation-menu": navigationMenuTemplate("base-ui"),
  table: renderTable,
  badge: badgeTemplate("base-ui"),
  label: renderLabel,
  textarea: renderTextarea,
  switch: renderSwitch,
  "radio-group": renderRadioGroup,
  slider: renderSlider,
  toggle: renderToggle,
  "toggle-group": renderToggleGroup,
  field: fieldTemplate(["has-data-checked:"]),
  "popover": renderPopover,
  "hover-card": renderHoverCard,
  "alert-dialog": renderAlertDialog,
  "sheet": renderSheet,
  "context-menu": renderContextMenu,
  drawer: renderDrawer,
  command: renderCmdkCommand,
  combobox: renderBaseCombobox,
  "menubar": renderMenubar,
  "input-group": inputGroupTemplate("base-ui"),
  button: renderButton,
  input: renderInput,
  checkbox: renderCheckbox,
  dialog: renderDialog,
  select: renderSelect,
  "dropdown-menu": renderDropdownMenu,
  tabs: renderTabs,
  toast: renderToast,
  tooltip: renderTooltip,
};

const RADIX: Record<string, Template> = {
  ...VISUAL,
  accordion: accordionTemplate("radix"),
  collapsible: collapsibleTemplate("radix"),
  breadcrumb: breadcrumbTemplate("radix"),
  pagination: paginationTemplate("radix"),
  "scroll-area": scrollAreaTemplate("radix"),
  separator: separatorTemplate("radix"),
  carousel: carouselTemplate("radix"),
  calendar: calendarTemplate("radix"),
  "date-picker": datePickerTemplate("radix"),
  "data-table": dataTableTemplate("radix"),
  bubble: bubbleTemplate("radix"),
  attachment: attachmentTemplate("radix"),
  marker: markerTemplate("radix"),
  sidebar: sidebarTemplate("radix"),
  direction: directionTemplate("radix"),
  "aspect-ratio": aspectRatioTemplate("radix"),
  avatar: avatarTemplate("radix"),
  progress: progressTemplate("radix"),
  item: itemTemplate("radix"),
  "button-group": buttonGroupTemplate("radix"),
  "navigation-menu": navigationMenuTemplate("radix"),
  table: renderTable,
  badge: badgeTemplate("radix"),
  label: renderRadixLabel,
  switch: renderRadixSwitch,
  "radio-group": renderRadixRadioGroup,
  slider: renderRadixSlider,
  toggle: renderRadixToggle,
  "toggle-group": renderRadixToggleGroup,
  field: fieldTemplate(["has-data-[state=checked]:"]),
  "popover": renderRadixPopover,
  "hover-card": renderRadixHoverCard,
  "alert-dialog": renderRadixAlertDialog,
  "sheet": renderRadixSheet,
  "context-menu": renderRadixContextMenu,
  drawer: renderRadixDrawer,
  command: renderCmdkCommand,
  combobox: renderBaseCombobox,
  "menubar": renderRadixMenubar,
  "input-group": inputGroupTemplate("radix"),
  // A plain <textarea>, as on Base UI.
  textarea: renderTextarea,
  button: renderRadixButton,
  input: renderRadixInput,
  checkbox: renderRadixCheckbox,
  dialog: renderRadixDialog,
  select: renderRadixSelect,
  "dropdown-menu": renderRadixDropdownMenu,
  tabs: renderRadixTabs,
  toast: renderRadixToast,
  tooltip: renderRadixTooltip,
};

const REACT_ARIA: Record<string, Template> = {
  ...VISUAL,
  accordion: accordionTemplate("react-aria"),
  collapsible: collapsibleTemplate("react-aria"),
  breadcrumb: breadcrumbTemplate("react-aria"),
  pagination: paginationTemplate("react-aria"),
  "scroll-area": scrollAreaTemplate("react-aria"),
  separator: separatorTemplate("react-aria"),
  carousel: carouselTemplate("react-aria"),
  calendar: calendarTemplate("react-aria"),
  "date-picker": datePickerTemplate("react-aria"),
  "data-table": dataTableTemplate("react-aria"),
  bubble: bubbleTemplate("react-aria"),
  attachment: attachmentTemplate("react-aria"),
  marker: markerTemplate("react-aria"),
  sidebar: sidebarTemplate("react-aria"),
  direction: directionTemplate("react-aria"),
  "aspect-ratio": aspectRatioTemplate("react-aria"),
  avatar: avatarTemplate("react-aria"),
  progress: progressTemplate("react-aria"),
  item: itemTemplate("react-aria"),
  "button-group": buttonGroupTemplate("react-aria"),
  // React Aria's collection Table, as in shadcn's React Aria registry.
  table: renderAriaTable,
  badge: badgeTemplate("react-aria"),
  label: renderAriaLabel,
  textarea: renderAriaTextarea,
  switch: renderAriaSwitch,
  "radio-group": renderAriaRadioGroup,
  slider: renderAriaSlider,
  toggle: renderAriaToggle,
  "toggle-group": renderAriaToggleGroup,
  field: fieldTemplate(["has-data-selected:"]),
  "popover": renderAriaPopover,
  "hover-card": renderAriaHoverCard,
  "alert-dialog": renderAriaAlertDialog,
  "sheet": renderAriaSheet,
  "context-menu": renderAriaContextMenu,
  // React Aria has no drawer; shadcn uses Base UI's here too.
  drawer: renderDrawer,
  command: renderAriaCommand,
  combobox: renderAriaCombobox,
  "menubar": renderAriaMenubar,
  "input-group": inputGroupTemplate("react-aria"),
  button: renderAriaButton,
  input: renderAriaInput,
  checkbox: renderAriaCheckbox,
  dialog: renderAriaDialog,
  select: renderAriaSelect,
  "dropdown-menu": renderAriaDropdownMenu,
  tabs: renderAriaTabs,
  toast: renderAriaToast,
  tooltip: renderAriaTooltip,
};

const TEMPLATES: Record<Base, Record<string, Template>> = { "base-ui": BASE_UI, radix: RADIX, "react-aria": REACT_ARIA };
const FILE_TEMPLATES: Record<Exclude<Target, Base>, Record<string, FilesTemplate>> = { "reka-ui": VUE_TEMPLATES, "bits-ui": SVELTE_TEMPLATES };

// Runtime dependencies the generated components of a target import.
export const BASE_DEPS: Record<Target, string[]> = {
  "base-ui": ["@base-ui/react", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"],
  radix: ["radix-ui", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"],
  "react-aria": ["react-aria-components", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react"],
  "reka-ui": ["reka-ui", "@vueuse/core", "class-variance-authority", "clsx", "tailwind-merge", "@lucide/vue"],
  // Select.Value needs 2.19; @internationalized/date is bits-ui's peer dependency.
  "bits-ui": ["bits-ui@^2.19", "@internationalized/date", "class-variance-authority", "clsx", "tailwind-merge", "@lucide/svelte"],
};

// Packages one component needs beyond its base's, on each base (Calendar needs react-day-picker).
// Only included components' packages are installed.
export const COMPONENT_DEPS: Partial<Record<string, Partial<Record<Target, string[]>>>> = {
  "input-otp": { "base-ui": ["input-otp"], radix: ["input-otp"], "react-aria": ["input-otp"], "reka-ui": ["vue-input-otp"] },
  drawer: {
    radix: ["vaul"],
    "react-aria": ["@base-ui/react"],
    // Vaul's ports, which the Radix output's classes carry over to (vaul-svelte's Svelte 5 line is
    // its next tag; Svelte packages go in as devDependencies, which the CLI sees to).
    "reka-ui": ["vaul-vue"],
    "bits-ui": ["vaul-svelte@next"],
  },
  command: { "base-ui": ["cmdk"], radix: ["cmdk"] },
  sonner: {
    "base-ui": ["sonner"],
    radix: ["sonner"],
    "react-aria": ["sonner"],
    // Sonner's ports, as shadcn-vue and shadcn-svelte use.
    "reka-ui": ["vue-sonner@^2"],
    "bits-ui": ["svelte-sonner@^1"],
  },
  // The major versions shadcn's code is written against.
  calendar: {
    "base-ui": ["react-day-picker@^9", "date-fns"],
    radix: ["react-day-picker@^9", "date-fns"],
    "react-aria": ["@internationalized/date"],
    // Reka's calendar takes @internationalized/date values (bits-ui has it as a base dependency).
    "reka-ui": ["@internationalized/date"],
  },
  "date-picker": {
    "react-aria": ["@internationalized/date"],
    "reka-ui": ["@internationalized/date"],
  },
  "message-scroller": { "base-ui": ["@shadcn/react"], radix: ["@shadcn/react"], "react-aria": ["@shadcn/react"] },
  questionnaire: { "base-ui": ["@shadcn/react"], radix: ["@shadcn/react"], "react-aria": ["@shadcn/react"] },
  carousel: { "base-ui": ["embla-carousel-react"], radix: ["embla-carousel-react"], "react-aria": ["embla-carousel-react"], "reka-ui": ["embla-carousel-vue"], "bits-ui": ["embla-carousel-svelte"] },
  // shadcn-vue's chart is on Unovis (its Vue package and the core it draws with), shadcn-svelte's on
  // LayerChart 2.
  chart: { "base-ui": ["recharts@^3"], radix: ["recharts@^3"], "react-aria": ["recharts@^3"], "reka-ui": ["@unovis/vue@^1.7", "@unovis/ts@^1.7"], "bits-ui": ["layerchart@^2"] },
  resizable: { "base-ui": ["react-resizable-panels@^4"], radix: ["react-resizable-panels@^4"], "react-aria": ["react-resizable-panels@^4"], "bits-ui": ["paneforge"] },
  "data-table": {
    "base-ui": ["@tanstack/react-table@^8"],
    radix: ["@tanstack/react-table@^8"],
    "react-aria": ["@tanstack/react-table@^8"],
    // As shadcn-vue (TanStack Table 9) and shadcn-svelte (table-core 8, with its Svelte helpers) do.
    "reka-ui": ["@tanstack/vue-table@^9"],
    "bits-ui": ["@tanstack/table-core@^8"],
  },
  // Radix has no combobox; shadcn's Radix version is Base UI's.
  combobox: { radix: ["@base-ui/react"] },
};

// "react-day-picker@^9" -> "react-day-picker"; "@tanstack/react-table@^8" -> "@tanstack/react-table".
export function packageName(spec: string): string {
  const at = spec.indexOf("@", 1);
  return at === -1 ? spec : spec.slice(0, at);
}

// Every package the generated code of this system imports, the base's first.
export function dependenciesFor(system: DesignSystem, base: Target = system.base): string[] {
  const deps = new Set(BASE_DEPS[base].filter((d) => !/^(lucide-react|@lucide\/(vue|svelte))$/.test(d)));
  // The system's icon packages, in its framework.
  if (isReact(base)) for (const dep of iconPackages(system)) deps.add(dep);
  else if (base === "reka-ui") for (const dep of vueIconPackages(system)) deps.add(dep);
  else for (const dep of svelteIconPackages(system)) deps.add(dep);
  for (const name of Object.keys(includedComponents(system))) for (const dep of COMPONENT_DEPS[name]?.[base] ?? []) deps.add(dep);
  return [...deps];
}

export function supportedComponents(base: Target): string[] {
  return Object.keys(isReact(base) ? TEMPLATES[base] : FILE_TEMPLATES[base]);
}

export class UnsupportedComponentError extends Error {
  constructor(
    readonly base: Target,
    readonly component: string,
  ) {
    super(`${component} has no template for ${base} yet`);
    this.name = "UnsupportedComponentError";
  }
}

export type RenderOptions = {
  // Formatting is for files people read; the live preview skips it.
  format?: boolean;
};

// A template imports React for React.ComponentProps and hooks; a file that ends up using neither
// (its JSX needs no import on the automatic runtime) drops the import, which a project with
// noUnusedLocals (create-vite's React template) would fail its build on.
function withoutUnusedReact(body: string): string {
  const line = 'import * as React from "react";\n';
  return body.includes(line) && !/\bReact\./.test(body.replace(line, "")) ? body.replace(line, "") : body;
}

export async function renderComponent(
  base: Base,
  anatomy: Anatomy,
  context: TemplateContext = { intents: {} },
  options: RenderOptions = {},
): Promise<string> {
  const template = TEMPLATES[base][anatomy.name];
  if (template === undefined) throw new UnsupportedComponentError(base, anatomy.name);
  const body = withoutUnusedReact(template(anatomy, context));
  // React Aria is client-only; other wrappers need a boundary when they execute client APIs.
  const client = base === "react-aria" || /\b(?:use[A-Z]\w*|createContext|forwardRef|createToastManager)\s*(?:<[^;]+?>)?\s*\(/.test(body);
  const source = client ? `"use client";\n\n${body}` : body;
  return options.format === false ? source : formatTsx(source);
}

// cn: clsx, then tailwind-merge told two things it doesn't know. The system's type steps: text-1,
// text-2… are font sizes, not colors (it only knows t-shirt sizes, so it would drop one of text-2
// and text-neutral-text as a clash). And a typed ring-offset width: ring-offset-(length:--x) is a
// width, which it otherwise reads as a color and drops beside ring-offset-(color:…), taking a
// focus ring's offset with it.
function cnSource(steps: string[]): string {
  const theme = steps.length === 0 ? "" : `theme: { text: [${steps.map((s) => JSON.stringify(s)).join(", ")}] }, `;
  return `import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge, validators } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: { ${theme}classGroups: { "ring-offset-w": [{ "ring-offset": [validators.isArbitraryVariableLength] }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
}

export const UTILS_SOURCE = cnSource([]);

export function utilsSource(system: DesignSystem): string {
  return cnSource([...flattenTokens(system.tokens).keys()].filter((path) => path.startsWith("font.size.")).map((path) => path.slice("font.size.".length)));
}

export type GeneratedFile = { path: string; source: string };

// lib/utils.ts for a target: Svelte's also carries the prop helper types its components import.
export function utilsFile(target: Target, system: DesignSystem): GeneratedFile {
  const utils = utilsSource(system);
  return { path: "lib/utils.ts", source: target === "bits-ui" ? svelteUtilsSource(utils) : utils };
}

// One component's files, paths from the project's root as renderAll writes them: components/ui/button.tsx
// for React; components/ui/button/Button.vue and components/ui/button/index.ts for Vue.
export async function renderComponentFiles(target: Target, anatomy: Anatomy, system: DesignSystem, options: RenderOptions = {}): Promise<GeneratedFile[]> {
  const context: TemplateContext = { intents: system.intents };
  if (isReact(target)) return [{ path: `components/ui/${anatomy.name}.tsx`, source: applyIcons(await renderComponent(target, anatomy, context, options), anatomy.name, system) }];
  const template = FILE_TEMPLATES[target][anatomy.name];
  if (template === undefined) throw new UnsupportedComponentError(target, anatomy.name);
  return Promise.all(
    template(anatomy, context).map(async (f) => {
      // The system's icons, before formatting (the pass can lengthen tags), as React's applyIcons.
      const source =
        target === "bits-ui" && f.path.endsWith(".svelte")
          ? applySvelteIcons(f.source, anatomy.name, system)
          : target === "reka-ui" && f.path.endsWith(".vue")
            ? applyVueIcons(f.source, anatomy.name, system)
            : f.source;
      // A component's files are in components/ui; one it shares with others (Svelte's is-mobile hook,
      // in the project's hooks folder) gives its path from the project's root, after a "/".
      const path = f.path.startsWith("/") ? f.path.slice(1) : `components/ui/${f.path}`;
      return { path, source: options.format === false ? source : await formatSource(f.path, source) };
    }),
  );
}

// Like renderAll, but a component that fails to generate is set aside with the reason instead of
// failing the rest, so the builder's preview shows everything else and names what broke.
export async function renderEach(
  base: Target,
  system: DesignSystem,
  options: RenderOptions = {},
): Promise<{ files: GeneratedFile[]; failed: { component: string; message: string }[] }> {
  const files: GeneratedFile[] = [utilsFile(base, system)];
  const failed: { component: string; message: string }[] = [];
  const supported = new Set(supportedComponents(base));
  for (const anatomy of Object.values(includedComponents(system))) {
    if (!supported.has(anatomy.name)) continue;
    try {
      files.push(...(await renderComponentFiles(base, anatomy, system, options)));
    } catch (e) {
      failed.push({ component: anatomy.name, message: e instanceof Error ? e.message : String(e) });
    }
  }
  files.push(...customIconFiles(base, system));
  return { files, failed };
}

// Every component the system includes that this base supports, plus the cn helper.
export async function renderAll(base: Target, system: DesignSystem, options: RenderOptions = {}): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [utilsFile(base, system)];
  const supported = new Set(supportedComponents(base));
  for (const anatomy of Object.values(includedComponents(system))) {
    if (!supported.has(anatomy.name)) continue;
    files.push(...(await renderComponentFiles(base, anatomy, system, options)));
  }
  files.push(...customIconFiles(base, system));
  return files;
}

// The system's own icons as components: React's in one file, Vue's in one (components/icons.ts),
// Svelte's a file each and an index.
export function customIconFiles(base: Target, system: DesignSystem): GeneratedFile[] {
  if (base === "bits-ui") return svelteCustomIconFiles(system);
  const icons = isReact(base) ? customIconsFile(system) : base === "reka-ui" ? vueCustomIconsFile(system) : null;
  return icons === null ? [] : [icons];
}

// "circle-alert" -> "CircleAlertIcon", the lucide-react export name.
export function lucideName(icon: string): string {
  // Letters and digits only, whatever it was given: this lands where code expects an identifier.
  return icon.split("-").map((s) => s.replace(/[^A-Za-z0-9]/g, "")).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("") + "Icon";
}
