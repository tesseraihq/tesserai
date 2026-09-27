import { fontFileName, type DesignSystem } from "@tesserai/core";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_HOST, origin, tokenFor } from "./auth";

// The system's own font files, downloaded into the project (beside tesserai.css, in fonts/) so it
// self-hosts them. They're served only to the account that uploaded them and its teams, so this
// needs `npx @tesserai/cli login`; without it the CSS still names them and the stack falls back.

export type FetchBinary = (url: string, token: string) => Promise<Uint8Array | null>;

const fetchBinary: FetchBinary = async (url, token) => {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
};

// Where tesserai.css finds a font file.
export const fontUrl = (file: Parameters<typeof fontFileName>[1], family: string) => `./fonts/${fontFileName(family, file)}`;

export async function downloadFonts(options: { system: DesignSystem; dir: string; host?: string; fetch?: FetchBinary }): Promise<{ written: string[]; missing: string[] }> {
  const written: string[] = [];
  const missing: string[] = [];
  const files = Object.entries(options.system.fonts ?? {}).flatMap(([family, font]) => font.files.map((file) => ({ family, file })));
  if (files.length === 0) return { written, missing };
  const host = origin(options.host ?? DEFAULT_HOST);
  const token = await tokenFor(host);
  await mkdir(options.dir, { recursive: true });
  for (const { family, file } of files) {
    const name = fontFileName(family, file);
    const path = join(options.dir, name);
    try {
      await access(path);
      continue;
    } catch {
      // Not downloaded yet.
    }
    // A stand-in fetch (tests) needs no sign-in; the real one does.
    const bytes = token === undefined && options.fetch === undefined ? null : await (options.fetch ?? fetchBinary)(`${host}/api/fonts/${file.id}`, token ?? "").catch(() => null);
    if (bytes === null) {
      missing.push(`${family} (${file.name})`);
      continue;
    }
    await writeFile(path, bytes);
    written.push(name);
  }
  return { written, missing };
}
