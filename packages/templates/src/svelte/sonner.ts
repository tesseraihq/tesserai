import type { Anatomy } from "@tesserai/core";
import type { GeneratedFile } from "../render";
import { SONNER_ICONS, sonnerPieces } from "../sonner";
import { lucideImport, quoted, svelteFile } from "./emit";
import { bitsVars } from "./states";

// Sonner on svelte-sonner, as shadcn-svelte has it (without mode-watcher: the colours come from
// the system's tokens, which follow light and dark): the React file's Toaster, its colours through
// Sonner's variables and its classes through toastOptions.classes (svelte-sonner's name for
// classNames), each kind's icon a snippet. Call toast("Saved") from anywhere: import { toast } from
// "svelte-sonner".
export function sonnerFiles(anatomy: Anatomy): GeneratedFile[] {
  const p = bitsVars(sonnerPieces(anatomy));
  const snippet: Record<string, string> = { success: "successIcon", info: "infoIcon", warning: "warningIcon", error: "errorIcon", loading: "loadingIcon" };
  return [
    svelteFile("sonner/sonner.svelte", {
      script: `${SONNER_ICONS.map(([, name]) => name)
        .sort()
        .map(lucideImport)
        .join("\n")}
import { Toaster as Sonner, type ToasterProps } from "svelte-sonner";

const toasterClasses = ${quoted(p.toaster)};
const iconClasses = ${quoted(p.icon)};
const loadingIconClasses = ${quoted(p.loadingIcon)};
const vars = ${JSON.stringify(
        Object.entries(p.vars)
          .map(([k, v]) => `${k}: ${v};`)
          .join(" "),
      )};
const classes = {
${Object.entries(p.classNames)
  .map(([k, v]) => `  ${k}: ${quoted(v)},`)
  .join("\n")}
};

let { style, toastOptions, ...restProps }: ToasterProps = $props();`,
      markup: `<Sonner class={toasterClasses} style={\`\${vars} \${style ?? ""}\`} toastOptions={{ ...toastOptions, classes: { ...classes, ...toastOptions?.classes } }} {...restProps}>
${SONNER_ICONS.map(([kind, name]) => `  {#snippet ${snippet[kind]}()}\n    <${name} class={${kind === "loading" ? "loadingIconClasses" : "iconClasses"}} />\n  {/snippet}`).join("\n")}
</Sonner>`,
    }),
    { path: "sonner/index.ts", source: `export { default as Toaster } from "./sonner.svelte";\n` },
  ];
}
