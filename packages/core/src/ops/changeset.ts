import { applyBrands } from "./brands";
import { z } from "zod";
import { recipeProblems } from "../components";
import { modeContexts } from "../modes";
import { resolveAll } from "../resolve";
import { DesignSystem, regenerate } from "../system";
import { flattenTokens, type Token } from "../tokens";
import { usageOfAll } from "../usage";
import { opByName, OPS } from "./catalog";
import { OpError } from "./define";

export const OpCall = z.object({ op: z.string().min(1), input: z.unknown() }).strict();
export type OpCall = z.infer<typeof OpCall>;

// A set of operations made as one change: one prompt, one undo step, one preview.
export const Changeset = z.object({ summary: z.string().optional(), ops: z.array(OpCall).min(1) }).strict();
export type Changeset = z.infer<typeof Changeset>;

// Everything that makes a system unusable: schema violations, recipes that reference missing or
// mistyped tokens, and references that do not resolve in light or dark.
export function validateSystem(system: DesignSystem): string[] {
  const parsed = DesignSystem.safeParse(system);
  if (!parsed.success) return parsed.error.issues.slice(0, 10).map((i) => `${i.path.join(".")}: ${i.message}`);
  const flat = flattenTokens(system.tokens);
  const problems: string[] = [];
  for (const anatomy of Object.values(system.components)) problems.push(...recipeProblems(anatomy, flat));
  for (const context of modeContexts(
    [...flat.values()].flatMap((t) => (t.$modes ?? []).map((m) => m.selector)),
  )) {
    for (const [path, error] of resolveAll(flat, context).errors) {
      problems.push(`${path} (${JSON.stringify(context)}): ${error.message}`);
    }
  }
  for (const [name, def] of Object.entries(system.intents)) {
    if (!flat.has(`${def.scale}.1`)) problems.push(`intent ${name} reads from ${def.scale}, which is not a palette`);
  }
  return [...new Set(problems)];
}

export type Applied = { op: string; description: string };

export type ChangesetResult =
  | { ok: true; system: DesignSystem; applied: Applied[] }
  | { ok: false; error: string; failedAt: number | null; applied: Applied[] };

// Applies operations to a copy of the system, in order, regenerating after each so later
// operations see earlier ones (add a palette, then point an intent at it). Nothing is changed
// unless every operation succeeds and the result validates. Errors name the operation and say
// why, in words a model can act on.
export function applyChangeset(system: DesignSystem, changeset: Changeset): ChangesetResult {
  // A copy to change. It isn't parsed first: the system given is already one (every way in parses
  // it), and the result is checked in full below before it's accepted.
  const draft = JSON.parse(JSON.stringify(system)) as DesignSystem;
  const applied: Applied[] = [];
  for (const [index, call] of changeset.ops.entries()) {
    const op = opByName(call.op);
    if (op === undefined) return { ok: false, error: `there is no operation "${call.op}"`, failedAt: index, applied };
    try {
      const description = op.run(draft, call.input);
      regenerate(draft);
      applied.push({ op: call.op, description });
    } catch (e) {
      const message = e instanceof OpError ? e.message : e instanceof Error ? `${call.op}: ${e.message}` : String(e);
      return { ok: false, error: message, failedAt: index, applied };
    }
  }
  applyBrands(draft);
  const problems = validateSystem(draft);
  if (problems.length > 0) return { ok: false, error: `the result would be broken: ${problems.slice(0, 5).join("; ")}`, failedAt: null, applied };
  return { ok: true, system: draft, applied };
}

export type TokenChange = { path: string; kind: "added" | "removed" | "changed"; before?: Token; after?: Token };

export type SystemDiff = {
  tokens: TokenChange[];
  generators: string[];
  intents: string[];
  components: string[];
  other: string[];
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
// A token's meaning without bookkeeping: value and per-mode values.
const essence = (t: Token | undefined) => (t === undefined ? undefined : { $value: t.$value, $modes: t.$modes });

// What differs between two systems, in the units people and models reason about.
export function diffSystems(before: DesignSystem, after: DesignSystem): SystemDiff {
  const a = flattenTokens(before.tokens);
  const b = flattenTokens(after.tokens);
  const tokens: TokenChange[] = [];
  for (const [path, token] of b) {
    const old = a.get(path);
    if (old === undefined) tokens.push({ path, kind: "added", after: token });
    else if (!same(essence(old), essence(token))) tokens.push({ path, kind: "changed", before: old, after: token });
  }
  for (const [path, token] of a) if (!b.has(path)) tokens.push({ path, kind: "removed", before: token });
  const keys = <T>(x: Record<string, T>, y: Record<string, T>) => [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => !same(x[k], y[k]));
  const other: string[] = [];
  const grouped = new Set(["tokens", "generators", "intents", "components"]);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (
      !grouped.has(key) &&
      !same(before[key as keyof DesignSystem], after[key as keyof DesignSystem])
    ) other.push(key);
  }
  return {
    tokens,
    generators: keys(before.generators, after.generators),
    intents: keys(before.intents, after.intents),
    components: keys(before.components, after.components),
    other,
  };
}

// The included components that look different after a change: their own definition changed, or a
// token they draw with (directly or through references) did. What a proposal's preview highlights.
export function affectedComponents(before: DesignSystem, after: DesignSystem): string[] {
  const diff = diffSystems(before, after);
  const out = new Set(diff.components.filter((c) => c in after.components && !after.excluded.includes(c)));
  const changed = diff.tokens.filter((t) => t.kind !== "removed").map((t) => t.path);
  const removed = diff.tokens.filter((t) => t.kind === "removed").map((t) => t.path);
  for (const c of usageOfAll(after, changed).components) out.add(c);
  if (removed.length > 0) for (const c of usageOfAll(before, removed).components) if (c in after.components) out.add(c);
  // A component switched on or off, or icons changed, counts too.
  for (const c of [...before.excluded.filter((x) => !after.excluded.includes(x)), ...after.excluded.filter((x) => !before.excluded.includes(x))]) out.add(c);
  return [...out].sort();
}

export type OpManifestEntry = { name: string; group: string; summary: string; inputSchema: unknown };

// Every operation with a JSON Schema for its input: what an AI model (or an MCP server, or a
// command palette) is given to know what it can do.
export function opManifest(): OpManifestEntry[] {
  return OPS.filter((op) => !op.unlisted).map((op) => ({ name: op.name, group: op.group, summary: op.summary, inputSchema: z.toJSONSchema(op.input, { io: "input", unrepresentable: "any" }) }));
}
