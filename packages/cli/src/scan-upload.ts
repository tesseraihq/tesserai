import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tokenFor, type Http } from "./auth";
import { CLI_VERSION } from "./init";
import type { ScanResult } from "./scan";
import { sourceApi, type SourceFile } from "./source";

// `scan --upload`: the scan, kept with its system in the builder (Pro), so the team sees how the
// app uses the system beside it, and how that changes. What's sent is the aggregate: counts, kinds
// and class names. No source, and no paths but generated component files edited by hand.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - Code leaving the machine: the upload is built field by field from the counts, never by
//   spreading the result (whose override sites carry file paths and lines).
// - The wrong system: only the project's own account link (tesserai/source.json, /systems/<id>);
//   a share link can be anyone's, and isn't used.
// - A failure that reads as success: every refusal says why and what to do.

export type ScanUpload = {
  format: "tesserai/scan@1";
  project: string;
  cli: string;
  files: number;
  adoption: ScanResult["adoption"];
  components: { name: string; uses: number; files: number; options: Record<string, Record<string, number>>; dynamic: Record<string, number> }[];
  unused: string[];
  unusedOptions: ScanResult["unusedOptions"];
  overrides: { component: string; count: number; kinds: Record<string, number>; classes: { class: string; count: number }[] }[];
  suggestions: ScanResult["suggestions"];
  edited: ScanResult["edited"];
  hardCoded: number;
};

export function uploadOf(result: ScanResult, project: string): ScanUpload {
  return {
    format: "tesserai/scan@1",
    project: project.slice(0, 100),
    cli: CLI_VERSION,
    files: result.files,
    adoption: result.adoption,
    components: result.components.slice(0, 300).map((c) => ({ name: c.name, uses: c.uses, files: c.files, options: c.options, dynamic: c.dynamic })),
    unused: result.unused.slice(0, 300),
    unusedOptions: result.unusedOptions.slice(0, 2000),
    overrides: result.overrides.slice(0, 300).map((o) => {
      const classes = new Map<string, number>();
      for (const site of o.sites) for (const cls of new Set(site.classes)) classes.set(cls, (classes.get(cls) ?? 0) + 1);
      return {
        component: o.component,
        count: o.count,
        kinds: o.kinds as Record<string, number>,
        classes: [...classes]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([cls, count]) => ({ class: cls.slice(0, 120), count })),
      };
    }),
    suggestions: result.suggestions.slice(0, 100).map((s) => ({ ...s, class: s.class.slice(0, 120), message: s.message.slice(0, 400) })),
    edited: result.edited.filter((e) => /(^|\/)components\/ui\//.test(e.file)).slice(0, 300),
    hardCoded: result.hardCoded.length,
  };
}

// The project's name: its package.json's, else its folder's.
export async function projectName(dir: string): Promise<string> {
  try {
    const pkg = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as { name?: unknown };
    if (typeof pkg.name === "string" && pkg.name.trim() !== "") return pkg.name.trim();
  } catch {
    // No package.json: the folder's name.
  }
  return basename(dir);
}

export async function uploadScan(options: { dir: string; result: ScanResult; fetch: Http }): Promise<{ url: string; project: string }> {
  let link: string;
  try {
    link = (JSON.parse(await readFile(join(options.dir, "tesserai", "source.json"), "utf8")) as SourceFile).link;
  } catch {
    throw new Error("this project doesn't follow a system in an account, so there's nowhere to keep the scan. Install from the system's account link (Install in the builder, signed in): npx @tesserai/cli init <link>");
  }
  const source = sourceApi(link);
  if (source === null || !source.private) {
    throw new Error("this project follows a share link, which anyone can open; scans are kept only on a system in your account. Install from its account link (Install in the builder, signed in)");
  }
  const token = await tokenFor(source.origin);
  if (token === undefined) throw new Error("sign in to keep scans: npx @tesserai/cli login");
  const project = await projectName(options.dir);
  const res = await options.fetch(`${source.api}/scans`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(uploadOf(options.result, project)),
  });
  if (res.status === 201) return { url: link, project };
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (res.status === 401) throw new Error("you're signed out; run npx @tesserai/cli login");
  if (res.status === 402) throw new Error(body.message ?? "keeping scans in the builder is part of Pro");
  if (res.status === 404) throw new Error("that system isn't in your account or a team you're in");
  throw new Error(body.message ?? `the scan wasn't kept (${res.status})`);
}
