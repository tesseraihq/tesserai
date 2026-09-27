import { diffPatch, getAt, suggestionOf, type Suggestion } from "../patch";
import type { DesignSystem } from "../system";
import type { TokenGroup } from "../tokens";
import { withoutBrandModes } from "./brands";

// What a person set, without what's worked out from it: generated tokens nobody pinned, and brand
// values (both are remade by regenerating). A suggestion diffed on these carries only the change
// itself, so it stays small, and a teammate's edit to the same scale is one clash, not one per step.

const isToken = (v: unknown): v is { $value: unknown; $meta?: { generated?: unknown; pinned?: boolean } } => typeof v === "object" && v !== null && "$value" in v;

function prune(group: TokenGroup): void {
  for (const [key, value] of Object.entries(group)) {
    if (key.startsWith("$") || typeof value !== "object" || value === null) continue;
    if (isToken(value)) {
      if (value.$meta?.generated !== undefined && value.$meta.pinned !== true) delete group[key];
      continue;
    }
    prune(value as TokenGroup);
    if (Object.keys(value).length === 0) delete group[key];
  }
}

export function sourceOf(system: DesignSystem): DesignSystem {
  const copy = JSON.parse(JSON.stringify(system)) as DesignSystem;
  withoutBrandModes(copy.tokens);
  prune(copy.tokens);
  return copy;
}

// A suggestion between two versions of a system: its own changes, plus any tokens it removed
// outright (a removed palette's steps), which regenerating wouldn't take away.
export function systemSuggestion(before: DesignSystem, after: DesignSystem): Suggestion {
  const own = suggestionOf(sourceOf(before), sourceOf(after));
  const seen = new Set(own.patch.map((op) => op.path.join("\u0000")));
  for (const op of diffPatch(before, after)) {
    if (!("remove" in op) || op.path[0] !== "tokens" || seen.has(op.path.join("\u0000"))) continue;
    own.patch.push(op);
    own.base.push(getAt(before, op.path) ?? null);
  }
  return own;
}
