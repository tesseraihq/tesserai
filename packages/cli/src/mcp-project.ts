import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Which project the MCP server serves when it wasn't told (no --dir). An install from a directory
// or a one-click link (a Claude plugin, Cursor's Add to Cursor) starts the server wherever the
// editor starts processes, which isn't always the project. The editor knows the project: it lists
// its open folders as MCP roots.
//
// Ways it could go wrong, written before the code (AGENTS.md):
// - --dir given, then overridden by a root: a given folder is never replaced.
// - Started inside the project already (Claude Code starts servers in the folder it runs in): that
//   folder is kept when it has a system, without asking the editor anything.
// - An editor that doesn't list roots, or never answers: the starting folder, after at most 3s.
// - Several open folders: the first holding a system; with none, the first folder (where an
//   import would make one), never the home folder the server happened to start in.
// - Roots that aren't local folders (a remote workspace's URI): skipped.
// - Two tool calls at once each asking the editor: one question, shared.
// - The person opening another folder mid-session: forgotten when the editor says its roots
//   changed, found again on the next call.

export type Roots = () => Promise<{ roots: { uri: string }[] }>;

const hasSystem = (dir: string) => access(join(dir, "tesserai", "design-system.json")).then(() => true, () => false);

export async function findProject(start: string, roots: Roots | null, timeoutMs = 3_000): Promise<string> {
  if (await hasSystem(start)) return start;
  if (roots === null) return start;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listed = await Promise.race([
    roots().then((r) => r.roots, () => null),
    new Promise<null>((done) => (timer = setTimeout(() => done(null), timeoutMs))),
  ]).finally(() => clearTimeout(timer));
  const folders = (listed ?? []).flatMap((root) => {
    if (!root.uri.startsWith("file://")) return [];
    try {
      return [fileURLToPath(root.uri)];
    } catch {
      return [];
    }
  });
  for (const folder of folders) if (await hasSystem(folder)) return folder;
  return folders[0] ?? start;
}
