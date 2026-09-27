// Ports of Radix name their CSS variables as Radix does under their own prefix: Reka UI's
// --reka-popover-content-transform-origin is Radix's --radix-popover-content-transform-origin. So a
// class written for Radix carries over to such a port with this rename and nothing else.
export function renameRadixVars(classes: string, prefix: string): string {
  return classes.replaceAll("--radix-", `--${prefix}-`);
}

// Bits UI (Svelte) names its variables like Radix too, with one exception: the floating popups set
// --bits-<name>-content-transform-origin and -content-available-height, and a disclosure's content
// --bits-<name>-content-height, but the trigger's width is the anchor's
// (--bits-select-anchor-width for --radix-select-trigger-width).
export function renameRadixVarsForBits(classes: string): string {
  return renameRadixVars(classes.replace(/--radix-([a-z-]+?)-trigger-width/g, "--bits-$1-anchor-width"), "bits");
}
