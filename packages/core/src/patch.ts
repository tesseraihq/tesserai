// Patches: the smallest description of how one JSON document became another, as path → value
// sets. Live co-editing sends these instead of whole systems, so two people changing different
// things both land, and changing the same thing resolves to whoever the server heard last.
// Plain objects are diffed key by key; arrays and other values are replaced whole.

export type PatchOp = { path: string[]; value: unknown } | { path: string[]; remove: true };
export type Patch = PatchOp[];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    return a.length === other.length && a.every((x, i) => jsonEqual(x, other[i]));
  }
  const ka = Object.keys(a as Json).filter((k) => (a as Json)[k] !== undefined);
  const kb = Object.keys(b as Json).filter((k) => (b as Json)[k] !== undefined);
  return ka.length === kb.length && ka.every((k) => jsonEqual((a as Json)[k], (b as Json)[k]));
}

export function diffPatch(before: unknown, after: unknown, path: string[] = []): Patch {
  if (jsonEqual(before, after)) return [];
  if (!isObject(before) || !isObject(after)) return [{ path, value: after }];
  const ops: Patch = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[key];
    const a = after[key];
    if (a === undefined && b !== undefined) ops.push({ path: [...path, key], remove: true });
    else if (a !== undefined) ops.push(...diffPatch(b, a, [...path, key]));
  }
  return ops;
}

export function getAt(doc: unknown, path: readonly string[]): unknown {
  let node = doc;
  for (const key of path) {
    if (!isObject(node)) return undefined;
    node = node[key];
  }
  return node;
}

// Returns a new document; untouched branches are shared with the old one.
export function applyPatch<T>(doc: T, patch: Patch): T {
  let out: unknown = doc;
  for (const op of patch) out = setAt(out, op.path, "remove" in op ? undefined : op.value, "remove" in op);
  return out as T;
}

function setAt(node: unknown, path: readonly string[], value: unknown, remove: boolean): unknown {
  if (path.length === 0) return remove ? undefined : value;
  const [key, ...rest] = path as [string, ...string[]];
  const base: Json = isObject(node) ? node : {};
  const child = setAt(base[key], rest, value, remove);
  const copy: Json = { ...base };
  if (child === undefined) delete copy[key];
  else copy[key] = child;
  return copy;
}

// Undoes one's own step on a document others may have changed since: each part goes back only
// where it still holds what the step set. `forward` is the step, `before` the document before it.
export function revertPatch<T>(current: T, before: unknown, forward: Patch): { doc: T; clashed: string[][] } {
  const back: Patch = [];
  const clashed: string[][] = [];
  for (const op of forward) {
    const now = getAt(current, op.path);
    const set = "remove" in op ? undefined : op.value;
    if (!jsonEqual(now, set)) {
      clashed.push(op.path);
      continue;
    }
    const was = getAt(before, op.path);
    back.push(was === undefined ? { path: op.path, remove: true } : { path: op.path, value: was });
  }
  return { doc: applyPatch(current, back), clashed };
}

// A suggested change, kept apart from the document until someone applies it: the patch, and the
// value each patched path held when it was suggested (null where there was nothing).
export type Suggestion = { patch: Patch; base: unknown[] };

export function suggestionOf(before: unknown, after: unknown): Suggestion {
  const patch = diffPatch(before, after);
  return { patch, base: patch.map((op) => getAt(before, op.path) ?? null) };
}

// How a suggestion stands against the document as it is now: the paths someone changed since it
// was made (applying it would overwrite them), and whether it's already all there.
export function checkSuggestion(current: unknown, s: Suggestion): { clashes: string[][]; alreadyIn: boolean } {
  const clashes: string[][] = [];
  let alreadyIn = true;
  s.patch.forEach((op, i) => {
    const now = getAt(current, op.path);
    const wanted = "remove" in op ? undefined : op.value;
    if (jsonEqual(now, wanted)) return;
    alreadyIn = false;
    if (!jsonEqual(now ?? null, s.base[i] ?? null)) clashes.push(op.path);
  });
  return { clashes, alreadyIn };
}

// Applies a suggestion. `keep` leaves the paths that changed since as they are now; otherwise the
// suggestion's values win everywhere.
export function applySuggestion<T>(current: T, s: Suggestion, keep = false): T {
  if (!keep) return applyPatch(current, s.patch);
  const clashed = new Set(checkSuggestion(current, s).clashes.map((p) => p.join("\u0000")));
  return applyPatch(
    current,
    s.patch.filter((op) => !clashed.has(op.path.join("\u0000"))),
  );
}
