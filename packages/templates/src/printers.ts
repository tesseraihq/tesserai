import type { Framework } from "@tesserai/core";
import type { PagePrinter } from "./pages/print";
import { targetFramework, type Target } from "./render";
import { printSveltePage } from "./svelte/page";
import { printVuePage } from "./vue/page";

// Page and example printers for Vue and Svelte, from their template folders (vue/page.ts,
// svelte/page.ts), added as each lands. Kept out of the pages entry, which the React preview loads.
const PRINTERS: Partial<Record<Exclude<Framework, "react">, PagePrinter>> = { vue: printVuePage, svelte: printSveltePage };

// How to print pages and examples for a target: React's printer is printPage's own (printer
// undefined); null when the target's framework has no printer yet, so callers say so rather than
// hand a Vue project React code.
export function pagePrinting(target: Target): { printer: PagePrinter | undefined } | null {
  const framework = targetFramework(target);
  if (framework === "react") return { printer: undefined };
  const printer = PRINTERS[framework];
  return printer === undefined ? null : { printer };
}
