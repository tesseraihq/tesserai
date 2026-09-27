import { DesignSystem } from "./system";

// Older bundle formats are rewritten to the current one before validation. Empty until the format changes.
const MIGRATIONS: Record<string, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// Files saved before the product was named tesserai say "tessera/…"; they read as the same format.
export function renamedFormat(format: string): string {
  return format.startsWith("tessera/") ? `tesserai/${format.slice("tessera/".length)}` : format;
}

export function migrate(raw: unknown): unknown {
  let current = isRecord(raw) && typeof raw.format === "string" && raw.format !== renamedFormat(raw.format) ? { ...raw, format: renamedFormat(raw.format) } : raw;
  for (let i = 0; i < 10 && isRecord(current) && typeof current.format === "string"; i++) {
    const step = MIGRATIONS[current.format];
    if (step === undefined) break;
    current = step(current);
  }
  return current;
}

export type ParsedBundle = { ok: true; system: DesignSystem } | { ok: false; problem: string };

// The one definition of a valid system, shared by the builder, the CLI and the server: migrate,
// then validate. The problem names the first field that does not match.
export function parseBundle(raw: unknown): ParsedBundle {
  const parsed = DesignSystem.safeParse(migrate(raw));
  if (parsed.success) return { ok: true, system: parsed.data };
  const issue = parsed.error.issues[0];
  if (issue === undefined) return { ok: false, problem: "not a tesserai bundle" };
  // A field or a value this version doesn't know, at the top of the system (a framework added
  // after it was released): made by a newer tesserai, which the person can update to.
  const newer = issue.path.length <= 1 && (issue.code === "unrecognized_keys" || (issue.code as string) === "invalid_value" || (issue.code as string) === "invalid_enum_value");
  const where = issue.path.length === 0 ? "" : `${issue.path.join(".")}: `;
  return { ok: false, problem: newer ? `${where}${issue.message}. This system was made by a newer version of tesserai: update with npx @tesserai/cli@latest` : `${where}${issue.message}` };
}
