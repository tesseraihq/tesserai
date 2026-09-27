// A small line diff (LCS) so sync can show what changed without a dependency.
export type DiffLine = { kind: "same" | "add" | "remove"; text: string };

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  const width = m + 1;
  // lcs[i * width + j] = length of the LCS of a[i..] and b[j..]; a flat table needs no bounds assertions.
  const lcs = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const idx = i * width + j;
      lcs[idx] = a[i] === b[j] ? (lcs[idx + width + 1] ?? 0) + 1 : Math.max(lcs[idx + width] ?? 0, lcs[idx + 1] ?? 0);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const idx = i * width + j;
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: a[i] ?? "" });
      i++;
      j++;
    } else if ((lcs[idx + width] ?? 0) >= (lcs[idx + 1] ?? 0)) {
      out.push({ kind: "remove", text: a[i] ?? "" });
      i++;
    } else {
      out.push({ kind: "add", text: b[j] ?? "" });
      j++;
    }
  }
  while (i < n) out.push({ kind: "remove", text: a[i++] ?? "" });
  while (j < m) out.push({ kind: "add", text: b[j++] ?? "" });
  return out;
}

export type DiffSummary = { added: number; removed: number };

export function summarizeDiff(lines: DiffLine[]): DiffSummary {
  return {
    added: lines.filter((l) => l.kind === "add").length,
    removed: lines.filter((l) => l.kind === "remove").length,
  };
}

// Unified-style text with `context` lines of surrounding unchanged code around each change.
export function formatDiff(lines: DiffLine[], context = 2): string {
  const keep = new Set<number>();
  lines.forEach((line, index) => {
    if (line.kind === "same") return;
    for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k++) keep.add(k);
  });
  const out: string[] = [];
  let last = -2;
  for (const index of [...keep].sort((x, y) => x - y)) {
    const line = lines[index];
    if (line === undefined) continue;
    if (index !== last + 1 && out.length > 0) out.push("  ...");
    out.push(`${line.kind === "add" ? "+ " : line.kind === "remove" ? "- " : "  "}${line.text}`);
    last = index;
  }
  return out.join("\n");
}
