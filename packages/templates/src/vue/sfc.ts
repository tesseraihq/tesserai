import { cvaSource } from "../codegen";
import type { CvaConfig } from "../factor";
import type { GeneratedFile } from "../render";
import { rekaVars } from "./states";

// The small kit every Vue template writes its files with, so each component's file only says
// what's particular to it.

// A single-file component: <script setup lang="ts"> and a template, as shadcn-vue writes them.
export function sfc(path: string, script: string, template: string): GeneratedFile {
  const setup = script.trim() === "" ? "" : `<script setup lang="ts">\n${script.trim()}\n</script>\n\n`;
  return { path, source: `${setup}<template>\n${template.trim()}\n</template>\n` };
}

// The lines of a folder's index.ts that export each part's component under its name, so the
// import line is the same as React's: import { Button } from "@/components/ui/button". Sorted, as
// shadcn-vue's barrels are.
export function partExports(parts: string[]): string {
  return [...parts]
    .sort()
    .map((name) => `export { default as ${name} } from "./${name}.vue";`)
    .join("\n");
}

const quoted = (classes: string) => `'${rekaVars(classes).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\u0022")}'`;

// A class list (a JSON string from the shared class functions) as the single-quoted string a
// template expression takes: :class="cn('…', props.class)". The attribute's double quotes can't
// appear inside, so one in a class is written as an escape. Radix's CSS variables become Reka's.
export function classArg(json: string): string {
  return quoted(JSON.parse(json) as string);
}

// The same, from a list of classes (as the pieces functions give them).
export function classList(classes: readonly string[]): string {
  return quoted(classes.join(" "));
}

// A fixed class attribute, where the React template writes a plain className: no cn, because
// tailwind-merge would then drop classes React keeps (it takes ring-offset-(length:…) and
// ring-offset-(color:…) for one property), and the two would render differently.
export function staticClass(json: string): string {
  return staticClasses(JSON.parse(json) as string);
}

export function staticClasses(classes: string | readonly string[]): string {
  const text = typeof classes === "string" ? classes : classes.join(" ");
  return `class="${rekaVars(text).replace(/"/g, "&quot;")}"`;
}

// A cva config as index.ts exports it, under the name the React file gives it.
export function exportedCva(name: string, config: CvaConfig): string {
  return `export ${rekaVars(cvaSource(name, config))}`;
}

// ---------- parts ----------

// Every part file of a component lives in its folder: dialog/DialogTitle.vue.
export type Folder = { name: string; file: (part: string, script: string, template: string) => GeneratedFile };
export function folder(name: string): Folder {
  return { name, file: (part, script, template) => sfc(`${name}/${part}.vue`, script, template) };
}

const slotAttr = (slot: string | null) => (slot === null ? "" : ` data-slot="${slot}"`);

type RekaOptions = {
  // Reka's emits for the part (v-model, open changes, dismissal events), forwarded.
  emits?: boolean;
  // The slot props Reka's part gives its default slot (a root's open and close), passed on.
  slotProps?: boolean;
  // The prefix of Reka's Props and Emits types, where it isn't the component's name
  // (AlertDialogRoot's are AlertDialogProps and AlertDialogEmits).
  types?: string;
  // More attributes for the Reka element, written as they go in the template.
  attrs?: string;
};

// A Reka part with no classes of its own: its data-slot, and its props (and emits) passed through.
// `file` is the part's name (DialogTrigger), `reka` the Reka component it wraps (DialogRoot for Dialog).
export function passthrough(f: Folder, file: string, reka: string, slot: string | null, options: RekaOptions = {}): GeneratedFile {
  const t = options.types ?? reka;
  const types = options.emits ? `${t}Emits, ${t}Props` : `${t}Props`;
  const imports = options.emits ? `${reka}, useForwardPropsEmits` : reka;
  const script = `import type { ${types} } from "reka-ui";
import { ${imports} } from "reka-ui";

const props = defineProps<${t}Props>();
${options.emits ? `const emits = defineEmits<${t}Emits>();\nconst forwarded = useForwardPropsEmits(props, emits);` : ""}`;
  const bind = options.emits ? "forwarded" : "props";
  const template = options.slotProps
    ? `<${reka} v-slot="slotProps"${slotAttr(slot)} v-bind="${bind}">
  <slot v-bind="slotProps" />
</${reka}>`
    : `<${reka}${slotAttr(slot)} v-bind="${bind}">
  <slot />
</${reka}>`;
  return f.file(file, script, template);
}

// A Reka part with classes: the class prop is merged in with cn, the rest passed through.
// `classes` is the class expression's first argument (a quoted list, or a variants call).
export function styled(f: Folder, file: string, reka: string, slot: string, classes: string, options: RekaOptions = {}): GeneratedFile {
  const types = options.emits ? `${reka}Emits, ${reka}Props` : `${reka}Props`;
  const script = `import type { ${types} } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ${reka}, ${options.emits ? "useForwardPropsEmits" : "useForwardProps"} } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<${reka}Props & { class?: HTMLAttributes["class"] }>();
${options.emits ? `const emits = defineEmits<${reka}Emits>();\n` : ""}const delegatedProps = reactiveOmit(props, "class");
const forwarded = ${options.emits ? "useForwardPropsEmits(delegatedProps, emits)" : "useForwardProps(delegatedProps)"};`;
  const attrs = options.attrs === undefined ? "" : ` ${options.attrs}`;
  const open = `<${reka}${options.slotProps ? ` v-slot="slotProps"` : ""} data-slot="${slot}"${attrs} v-bind="forwarded" :class="cn(${classes}, props.class)">`;
  return f.file(file, script, `${open}\n  <slot${options.slotProps ? ` v-bind="slotProps"` : ""} />\n</${reka}>`);
}

// A plain element with classes: a class prop merged with cn; other attributes fall through.
export function plain(f: Folder, file: string, tag: string, slot: string, classes: string, attrs = ""): GeneratedFile {
  const script = `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`;
  return f.file(file, script, `<${tag}${attrs ? ` ${attrs}` : ""} data-slot="${slot}" :class="cn(${classes}, props.class)">\n  <slot />\n</${tag}>`);
}

// The folder's index.ts: the parts, then whatever else the component exports (its cva, types).
export function barrel(name: string, parts: string[], extra = ""): GeneratedFile {
  return { path: `${name}/index.ts`, source: extra.trim() === "" ? `${partExports(parts)}\n` : `${extra.trim()}\n\n${partExports(parts)}\n` };
}
