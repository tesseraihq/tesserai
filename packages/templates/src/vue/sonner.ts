import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { SONNER_ICONS, sonnerPieces } from "../sonner";
import { rekaVars } from "./states";
import { barrel, folder, staticClasses } from "./sfc";

// Sonner on vue-sonner, as shadcn-vue has it: the React file's Toaster, with its colours through
// Sonner's variables and its classes through toastOptions.classes (vue-sonner's name for
// classNames), and each kind's icon in its slot. vue-sonner's stylesheet comes with it, which
// vue-sonner 2 no longer injects itself. Call toast("Saved") from anywhere: import { toast } from
// "vue-sonner".
export function renderSonner(anatomy: Anatomy): GeneratedFile[] {
  const p = sonnerPieces(anatomy);
  const f = folder("sonner");
  const q = (s: string) => JSON.stringify(rekaVars(s));
  const toaster = f.file(
    "Sonner",
    `import type { ToasterProps } from "vue-sonner";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { computed } from "vue";
import { Toaster as Sonner } from "vue-sonner";
import "vue-sonner/style.css";

const props = defineProps<ToasterProps>();
const delegatedProps = reactiveOmit(props, "style", "toastOptions");
const style = computed(() => ({
${Object.entries(p.vars).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join("\n")}
  ...props.style,
}));
const toastOptions = computed(() => ({
  ...props.toastOptions,
  classes: {
${Object.entries(p.classNames).map(([k, v]) => `    ${k}: ${q(v.join(" "))},`).join("\n")}
    ...props.toastOptions?.classes,
  },
}));`,
    `<Sonner ${staticClasses(p.toaster)} v-bind="delegatedProps" :style="style" :toast-options="toastOptions">
${SONNER_ICONS.map(([kind, name]) => `  <template #${kind}-icon>\n    <${name} ${staticClasses(kind === "loading" ? p.loadingIcon : p.icon)} />\n  </template>`).join("\n")}
</Sonner>`,
  );
  return [toaster, barrel("sonner", [], `export { default as Toaster } from "./Sonner.vue";`)];
}
