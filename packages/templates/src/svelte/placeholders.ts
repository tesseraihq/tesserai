// Svelte templates import through shadcn-svelte's placeholders ("$UTILS$.js", "$UI$/button/index.js"),
// never a final path: SvelteKit 2 projects say $lib, SvelteKit 3 says #lib, and people set their own
// aliases in components.json. The CLI substitutes the project's aliases, the registry passes the
// placeholders through for shadcn-svelte's CLI to substitute, and code shown in the builder takes
// the defaults. See docs/frameworks (F11).
export const SVELTE_PLACEHOLDERS = { utils: "$UTILS$", ui: "$UI$", lib: "$LIB$", hooks: "$HOOKS$", components: "$COMPONENTS$" } as const;
export type SvelteAliases = Record<keyof typeof SVELTE_PLACEHOLDERS, string>;

// shadcn-svelte's defaults for a SvelteKit project.
export const DEFAULT_SVELTE_ALIASES: SvelteAliases = {
  utils: "$lib/utils",
  ui: "$lib/components/ui",
  lib: "$lib",
  hooks: "$lib/hooks",
  components: "$lib/components",
};

const PLACEHOLDER = /(["'])\$(UTILS|UI|LIB|HOOKS|COMPONENTS)\$/g;

// Replaces each placeholder that starts a quoted module path with the project's alias.
export function resolveSveltePlaceholders(source: string, aliases: Partial<SvelteAliases> = {}): string {
  const resolved = { ...DEFAULT_SVELTE_ALIASES, ...aliases };
  return source.replace(PLACEHOLDER, (_, quote: string, name: string) => `${quote}${resolved[name.toLowerCase() as keyof SvelteAliases]}`);
}
