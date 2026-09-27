import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { applyChangeset, colorDistance, emptyLook, lookToSystem, mergeLooks, parseColor, PRESETS, readTokenFile, type ImportResult, type Look } from "@tesserai/core";
import { z } from "zod";
import { DEFAULT_HOST, type Http } from "./auth";
import { env } from "./env";
import { importProject } from "./import-project";
import { changesOf, summarizeImport, systemIdOf } from "./import";

// The MCP route for importing: a coding agent reads a look that lives in code (an antd or MUI
// theme, a styled-components object, constants) and hands it over as design tokens, each with the
// file and line it's on. Every citation is checked here; one that doesn't hold is dropped and said.
// What the file readers find directly (stylesheets, token files) comes first; the agent's fills in.

export const IMPORT_GUIDE = `Bring this project's existing design system (its look: colors for light and dark, fonts, body text size, corners, spacing, shadows) into tesserai as a new system. It never changes the project. Read the project first, then call this once with what you found.

This tool already reads stylesheets (CSS variables, Tailwind v4 @theme, Sass/Less variables, plain rules), design-token files, next/font and Tailwind v3 configs by itself. Add what lives in code:
- antd: the ConfigProvider theme / ThemeConfig.token (colorPrimary, colorError, colorSuccess, colorWarning, colorBgBase, colorTextBase, colorBorder, borderRadius, fontFamily, fontSize).
- MUI: createTheme palette (primary.main, primary.contrastText, error.main, background.default and .paper, text.primary, divider, per mode), typography.fontFamily/fontSize, shape.borderRadius, spacing.
- Chakra: extendTheme colors, fonts, radii, semanticTokens (default / _dark), and components' defaultProps colorScheme: a solid button is the scheme's 500 with white text in light, 200 with gray.800 text in dark.
- Tailwind v3: tailwind.config theme.extend (colors, fontFamily, borderRadius) and the CSS variables it points at.
- styled-components, Emotion, Theme UI: the theme objects given to ThemeProvider; follow imports to the palette they name.
- Homegrown: color constants and the inline styles of buttons, cards, inputs and the page body.
- Fluent UI v9: createLightTheme(brand) / createDarkTheme(brand) take a 16-step ramp; the primary button is brand[80] in light and brand[70] in dark (cite those ramp entries), plus any overrides spread over the theme.
- Radix Themes: <Theme accentColor grayColor radius>; the primary is the accent scale's step 9 with --<accent>-contrast on it, text is gray-12, secondary text gray-a11; a custom palette file overrides those scales. Radix's own panel and surface colors aren't the app's card: leave card out unless the app sets one.
- Angular Material (M3): mat.theme / a generated palette file gives tonal palettes; primary is tone 40 in light and 80 in dark, text on it 100 / 20, surface neutral 98 / 6, outline-variant for borders.

Send a W3C design-token (DTCG) document:
- color.primary, color.primary-foreground (text on primary), color.background (page), color.card, color.foreground (main text), color.muted-foreground, color.border, color.destructive, color.success, color.warning; the same names under color.dark for dark mode; a whole numbered scale as color.<name>.<50…950> when the project has one.
- fontFamily.sans (body), fontFamily.heading, fontFamily.mono.
- In px: fontSize.base (body text), radius.md (the default corner), spacing.1 (the base step: 4 on a 4px grid; MUI spacing 8 is 8; Bootstrap's $spacer 1rem is 4).
- shadow.sm / shadow.md / shadow.lg as CSS box-shadow strings.
Every token says where its value is written: "$extensions": { "tesserai.source": "path/from/project/root:line" }, the line where the value itself appears (follow aliases: for primary: brand.primary, cite the line with brand.primary's value). Include only what the project states. Never a library's defaults, never a guess: leave those out and they're filled in. When dark mode comes from the library (antd's darkAlgorithm, MUI mode with no dark values), leave dark out and say so in notes.

Work in two calls. First dryRun: true: the reply says what came across and what's still filled in. If the project defines any of what's filled in, find it and add it. Then call once more without dryRun, with every token (not only the new ones). Tokens without a source, or whose line doesn't have the value, are dropped and listed back; fix them in that call. The result is a link for the person to open (once, within 10 minutes). Give them the link.`;

type Leaf = { path: string; node: Record<string, unknown> };

function leaves(node: unknown, path: string[] = [], out: Leaf[] = []): Leaf[] {
  if (typeof node !== "object" || node === null || Array.isArray(node)) return out;
  const o = node as Record<string, unknown>;
  if ("$value" in o || ("value" in o && "type" in o)) {
    out.push({ path: path.join("."), node: o });
    return out;
  }
  for (const [k, v] of Object.entries(o)) if (!k.startsWith("$")) leaves(v, [...path, k], out);
  return out;
}

// The value as text to look for on the cited line: an alias followed to what it names, a DTCG
// color object as CSS, a dimension with its unit. Undefined when it can't be read: then the
// citation can't be checked, and the token is dropped rather than trusted.
function written(value: unknown, byPath: Map<string, Record<string, unknown>>, hops = 0): string | undefined {
  if (typeof value === "string") {
    const alias = /^\{([^}]+)\}$/.exec(value.trim());
    if (alias === null) return value;
    const target = byPath.get(alias[1]!);
    return target === undefined || hops > 10 ? undefined : written(target.$value ?? target.value, byPath, hops + 1);
  }
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length > 0 ? String(value[0]) : undefined;
  if (typeof value === "object" && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.hex === "string") return v.hex;
    if (typeof v.value === "number") return `${v.value}${typeof v.unit === "string" ? v.unit : ""}`;
    const c = v.components;
    if (Array.isArray(c) && c.length === 3 && c.every((n) => typeof n === "number")) {
      const a = typeof v.alpha === "number" ? ` / ${v.alpha}` : "";
      if (v.colorSpace === "oklch") return `oklch(${c.join(" ")}${a})`;
      if (v.colorSpace === "hsl") return `hsl(${c[0]} ${c[1]}% ${c[2]}%${a})`;
      if (v.colorSpace === "srgb" || v.colorSpace === undefined) return `rgb(${c.map((n) => Math.round((n as number) * 255)).join(" ")}${a})`;
    }
  }
  return undefined;
}

// Does the cited line hold the value? The same kinds of match a person would accept: the text
// itself, a color that looks the same, a size in px or rem, a font's name.
export async function sourceHolds(dir: string, source: string, value: string | undefined): Promise<string | null> {
  const m = /^(.+):(\d+)$/.exec(source.trim());
  if (m === null) return `“${source}” isn't path:line`;
  const file = resolve(dir, m[1]!);
  const inside = relative(dir, file);
  if (inside.startsWith("..") || inside.startsWith(sep)) return `${m[1]} is outside the project`;
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    return `${m[1]} doesn't exist`;
  }
  const line = text.split("\n")[Number(m[2]) - 1];
  if (line === undefined) return `${m[1]} has no line ${m[2]}`;
  if (value === undefined) return null;
  const lower = line.toLowerCase();
  if (lower.includes(value.toLowerCase().replace(/^["']|["']$/g, ""))) return null;
  const color = parseColor(value);
  if (color !== undefined) {
    for (const lit of line.match(/#[0-9a-f]{3,8}\b|(?:rgb|hsl|oklch|oklab)a?\([^)]*\)|\b(?:white|black)\b/gi) ?? []) {
      const c = parseColor(lit);
      if (c !== undefined && colorDistance(c, color) < 2) return null;
    }
    return `line ${m[2]} of ${m[1]} has no color like ${value}`;
  }
  const n = Number.parseFloat(value);
  if (!Number.isNaN(n)) {
    for (const mm of line.matchAll(/(-?\d*\.?\d+)\s*(px|rem|em)?\b/g)) {
      const px = Number(mm[1]) * (mm[2] === "rem" || mm[2] === "em" ? 16 : 1);
      if (Math.abs(px - n) <= 0.5 || Math.abs(px / 4 - n) <= 0.25) return null;
    }
  }
  const font = value.split(",")[0]!.replace(/["']/g, "").trim().toLowerCase();
  if (font !== "" && (lower.includes(font) || lower.includes(font.replace(/\s+/g, "_")))) return null;
  return `line ${m[2]} of ${m[1]} doesn't have “${value}”`;
}

export type AgentImport = { name: string; look: Look; result: ImportResult | { error: string }; read: string[]; dropped: { token: string; why: string }[] };

export async function importFromAgent(dir: string, tokens: Record<string, unknown>, options: { name?: string; notes?: string[] } = {}): Promise<AgentImport> {
  const project = await importProject(dir, options.name === undefined ? {} : { name: options.name });
  // Check every cited line; keep only the tokens whose citation holds.
  const dropped: AgentImport["dropped"] = [];
  const kept = structuredClone(tokens) as Record<string, unknown>;
  const all = leaves(kept);
  const byPath = new Map(all.map((l) => [l.path, l.node]));
  for (const leaf of all) {
    const ext = leaf.node.$extensions as Record<string, unknown> | undefined;
    const source = typeof ext?.["tesserai.source"] === "string" ? (ext["tesserai.source"] as string) : undefined;
    const value = written(leaf.node.$value ?? leaf.node.value, byPath);
    const why = source === undefined ? "no file:line given" : value === undefined ? "its value can't be read, so the citation can't be checked" : await sourceHolds(dir, source, value);
    if (why === null) continue;
    dropped.push({ token: leaf.path, why });
    const parts = leaf.path.split(".");
    let parent: Record<string, unknown> = kept;
    for (const p of parts.slice(0, -1)) parent = parent[p] as Record<string, unknown>;
    delete parent[parts.at(-1)!];
  }
  const agentLook = readTokenFile(kept, "agent");
  const look = mergeLooks(project.look, "error" in agentLook ? emptyLook() : agentLook);
  look.notes.push(...(options.notes ?? []));
  const read = [...project.read, ...(leaves(kept).length > 0 ? ["your coding agent's reading of the code"] : [])];
  return { name: project.name, look, result: lookToSystem(look, project.name), read, dropped };
}

export function registerImportTool(server: McpServer, dirOf: () => string, http: Http = fetch as unknown as Http): void {
  server.registerTool(
    "import_design_system",
    {
      title: "Import a design system",
      description: IMPORT_GUIDE,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      inputSchema: {
        tokens: z.record(z.string(), z.unknown()).describe("A DTCG document of the look you found, every token with $extensions['tesserai.source'] = 'path:line'"),
        name: z.string().optional().describe("The system's name (default: from package.json)"),
        notes: z.array(z.string()).optional().describe("What the person should know that isn't a value, e.g. 'Dark mode comes from antd's darkAlgorithm, so it's filled in.'"),
        dryRun: z.boolean().optional().describe("Only report what would come across"),
        into: z.string().optional().describe("A system imported before (its link, /systems/<id>): update it with what the code changed, for the person to review, instead of making a new one"),
      },
    },
    async ({ tokens, name, notes, dryRun, into }) => {
      const dir = dirOf();
      const got = await importFromAgent(dir, tokens, { ...(name === undefined ? {} : { name }), ...(notes === undefined ? {} : { notes }) });
      const project = { name: got.name, look: emptyLook(), result: got.result, read: got.read, ignored: [] };
      const lines = summarizeImport(project);
      if (got.dropped.length > 0) lines.push("", "Dropped (fix and call again):", ...got.dropped.map((d) => `  ${d.token}: ${d.why}`));
      const reply = (extra: string[] = [], isError = false) => ({ content: [{ type: "text" as const, text: [...lines, ...extra].join("\n") }], ...(isError ? { isError: true } : {}) });
      if ("error" in got.result) return reply([], true);
      const applied = applyChangeset(PRESETS[0]!.build(), got.result.changeset);
      if (!applied.ok) return reply([`The import couldn't be made into a system: ${applied.error}`], true);
      const report = { via: "mcp", read: got.read, found: got.result.found, filled: got.result.filled, skipped: got.result.skipped, warnings: got.result.warnings };
      if (dryRun === true) {
        const open = got.result.filled.filter((k) => !/^(dark)$/.test(k));
        return reply(["", "Nothing was made (dryRun).", ...(open.length === 0 ? [] : [`Still filled in: ${open.join(", ")}. If the project defines any of these, find where and include them in the final call.`])]);
      }
      // The benchmark reads the result from a file instead of a link.
      const out = env("IMPORT_OUT");
      if (out !== undefined) {
        await writeFile(out, JSON.stringify({ system: applied.system, report, dropped: got.dropped }));
        return reply(["", `Saved for the benchmark to ${out}.`]);
      }
      const host = (env("HOST") ?? DEFAULT_HOST).replace(/\/$/, "");
      let target: string | undefined;
      try {
        target = into === undefined ? undefined : systemIdOf(into);
      } catch (e) {
        return reply([(e as Error).message], true);
      }
      const extra = target === undefined ? {} : { into: target, changes: changesOf(got.look) };
      const res = await http(`${host}/api/imports`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ system: applied.system, report, ...extra }), signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return reply([`tesserai couldn't take the import (${res.status}). Try again, or run npx @tesserai/cli import --out system.tesserai.json.`], true);
      const { url } = (await res.json()) as { url: string };
      return reply(["", `Open it in tesserai: ${url}`, "The link works once, for 10 minutes. Signed in, it's saved to the person's account; otherwise, to that browser."]);
    },
  );
}

