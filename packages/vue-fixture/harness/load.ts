import { join, relative, sep } from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import { FIXTURE_DIR, GENERATED_DIR } from "./files";

// Loads generated modules (TSX, TS and .vue) into the test's Node process through Vite, as the
// fixture app would build them. "ssr" compiles Vue components for server rendering; "dom"
// compiles them for the browser, to mount into a DOM the test provides (happy-dom), for what only
// renders there: portals, and so anything inside an open dialog.
export type Mode = "ssr" | "dom";
export type Loader = { load: <T>(path: string) => Promise<T>; close: () => Promise<void> };

export async function createLoader(mode: Mode): Promise<Loader> {
  // Vue's plugin imports Vue, and Vue's DOM runtime reads `document` once, when first loaded: so
  // it loads here, after a DOM test has put its document on globalThis.
  const { default: vue } = await import("@vitejs/plugin-vue");
  const server: ViteDevServer = await createServer({
    configFile: false,
    root: FIXTURE_DIR,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [runAlias(), mode === "ssr" ? vue() : forClient(vue())],
  });
  return {
    load: async <T>(path: string) => (await server.ssrLoadModule(path)) as T,
    close: () => server.close(),
  };
}

// `@/…` imported from a file in a run folder is that run's own file (each run is a project root).
function runAlias(): Plugin {
  return {
    name: "tesserai:run-alias",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!source.startsWith("@/") || importer === undefined) return null;
      const within = relative(GENERATED_DIR, importer);
      if (within.startsWith("..")) return null;
      const run = within.split(sep)[0]!;
      return this.resolve(join(GENERATED_DIR, run, source.slice(2)), importer, { ...options, skipSelf: true });
    },
  };
}

// Vue's plugin compiles for the server when Vite loads a module for Node; this makes it compile
// for the browser instead, so the component can be mounted into a DOM.
function forClient(plugin: Plugin): Plugin {
  const wrapped: Plugin = { ...plugin };
  for (const name of ["resolveId", "load", "transform"] as const) {
    const hook = plugin[name] as unknown;
    if (hook === undefined) continue;
    const handler = (typeof hook === "function" ? hook : (hook as { handler: Function }).handler) as (...args: unknown[]) => unknown;
    const client = function (this: unknown, ...args: unknown[]) {
      const last = args.at(-1);
      if (typeof last === "object" && last !== null && "ssr" in last) args[args.length - 1] = { ...last, ssr: false };
      return handler.apply(this, args);
    };
    (wrapped as unknown as Record<string, unknown>)[name] = typeof hook === "function" ? client : { ...(hook as object), handler: client };
  }
  return wrapped;
}
