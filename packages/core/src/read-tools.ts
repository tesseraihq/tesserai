import { z } from "zod";
import {
  checkContrast,
  DEFAULT_MODE,
  flattenTokens,
  getToken,
  includedComponents,
  listOverrides,
  isTokenRef,
  refPath,
  resolveToken,
  summarizeContrast,
  tokenInContext,
  usageOf,
  type DesignSystem,
  type ModeContext,
} from "./index";

// ---------- read tools: the model looks before it changes ----------

export const GetTokens = z.object({ prefix: z.string().describe("Path prefix, e.g. color.brand, intent.primary, space, button") }).strict();
export const GetComponent = z.object({ component: z.string() }).strict();
export const Explain = z
  .object({ path: z.string().describe("A token path, e.g. intent.primary.solid or button.height.md"), scheme: z.enum(["light", "dark"]).default("light") })
  .strict();
export const Usage = z.object({ path: z.string() }).strict();
export const CheckContrast = z.object({}).strict();
export const ListOverrides = z.object({}).strict();

export type ReadResult = { ok: true; data: unknown } | { ok: false; error: string };

// Runs a read tool against a system. Pure, synchronous, and safe to call any number of times.
export function runReadTool(system: DesignSystem, name: string, input: unknown): ReadResult {
  const flat = flattenTokens(system.tokens);
  const fail = (error: string): ReadResult => ({ ok: false, error });
  switch (name) {
    case "get_tokens": {
      const i = GetTokens.safeParse(input);
      if (!i.success) return fail(i.error.message);
      const rows = [...flat].filter(([p]) => p === i.data.prefix || p.startsWith(`${i.data.prefix}.`)).slice(0, 200);
      return { ok: true, data: Object.fromEntries(rows.map(([p, t]) => [p, { type: t.$type, value: t.$value, modes: t.$modes, pinned: t.$meta?.pinned === true }])) };
    }
    case "get_component": {
      const i = GetComponent.safeParse(input);
      if (!i.success) return fail(i.error.message);
      const anatomy = system.components[i.data.component];
      return anatomy === undefined ? fail(`no component "${i.data.component}"; components are ${Object.keys(system.components).join(", ")}`) : { ok: true, data: anatomy };
    }
    case "explain": {
      const i = Explain.safeParse(input);
      if (!i.success) return fail(i.error.message);
      const context: ModeContext = { ...DEFAULT_MODE, colorScheme: i.data.scheme };
      const chain: { path: string; value: unknown }[] = [];
      let path: string | undefined = i.data.path;
      const seen = new Set<string>();
      while (path !== undefined && !seen.has(path)) {
        seen.add(path);
        const token = getToken(system.tokens, path);
        if (token === undefined) return fail(`no token ${path}`);
        const value = tokenInContext(token, context).$value;
        chain.push({ path, value });
        path = isTokenRef(value) ? refPath(value) : undefined;
      }
      try {
        return { ok: true, data: { chain, resolved: resolveToken(flat, i.data.path, context).$value } };
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
    }
    case "usage": {
      const i = Usage.safeParse(input);
      if (!i.success) return fail(i.error.message);
      return { ok: true, data: usageOf(system, i.data.path) };
    }
    case "check_contrast": {
      const checks = checkContrast(includedComponents(system), flat);
      const failing = checks.filter((c) => !c.passes && !c.exempt).slice(0, 30);
      return {
        ok: true,
        data: {
          summary: summarizeContrast(checks),
          failing: failing.map((c) => ({ component: c.component, part: c.part, state: c.state, selection: c.selection, scheme: c.colorScheme, ratio: Number(c.ratio.toFixed(2)), needs: c.required, fix: c.fix })),
        },
      };
    }
    case "list_overrides":
      return { ok: true, data: listOverrides(system) };
    default:
      return fail(`no read tool "${name}"`);
  }
}

export const READ_TOOLS = ["get_tokens", "get_component", "explain", "usage", "check_contrast", "list_overrides"] as const;
