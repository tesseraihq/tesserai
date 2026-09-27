// A generated file formatted by its kind: TypeScript and TSX, Vue single-file components (Prettier's
// HTML plugin reads them), and Svelte components (prettier-plugin-svelte's browser build, which
// runs on Prettier's standalone build like the rest; it brings the Svelte compiler, so it's loaded
// only when a Svelte file is formatted).
export async function formatSource(path: string, source: string): Promise<string> {
  if (path.endsWith(".svelte")) {
    const [prettier, estree, typescript, svelte] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/estree"),
      import("prettier/plugins/typescript"),
      // @ts-expect-error: the plugin's browser build ships without types.
      import("prettier-plugin-svelte/browser") as Promise<import("prettier").Plugin>,
    ]);
    return prettier.format(source, { parser: "svelte", plugins: [estree, typescript, svelte], printWidth: 100 });
  }
  if (path.endsWith(".vue")) {
    const [prettier, estree, typescript, html, postcss] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/estree"),
      import("prettier/plugins/typescript"),
      import("prettier/plugins/html"),
      import("prettier/plugins/postcss"),
    ]);
    return prettier.format(source, { parser: "vue", plugins: [estree, typescript, html, postcss], printWidth: 100 });
  }
  return formatTsx(source);
}

// Prettier's standalone build runs in the browser too. It's loaded only when something is
// formatted (the command line, downloads), not with every page: the builder's live preview skips it.
export async function formatTsx(source: string): Promise<string> {
  const [prettier, estree, typescript] = await Promise.all([import("prettier/standalone"), import("prettier/plugins/estree"), import("prettier/plugins/typescript")]);
  return prettier.format(source, {
    parser: "typescript",
    plugins: [estree, typescript],
    printWidth: 100,
  });
}
