import { AsyncLocalStorage } from "node:async_hooks";
import { open, realpath, unlink } from "node:fs/promises";
import { join } from "node:path";

const held = new AsyncLocalStorage<ReadonlySet<string>>();

// A filesystem lock also protects two MCP processes or a CLI sync alongside an agent. Nested
// sync inside apply_changes shares its lock. Competing processes fail promptly, never spin.
export async function withProjectLock<T>(dir: string, work: () => Promise<T>): Promise<T> {
  const root = await realpath(dir);
  const current = held.getStore();
  if (current?.has(root)) return work();
  const path = join(root, ".tesserai-write.lock");
  const file = await open(path, "wx", 0o600).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "EEXIST") throw new Error(`another tesserai command is writing this project; retry when it finishes. If it crashed, confirm it has stopped before removing ${path}`);
    throw error;
  });
  try {
    await file.writeFile(JSON.stringify({ pid: process.pid, started: new Date().toISOString() }) + "\n");
    return await held.run(new Set([...(current ?? []), root]), work);
  } finally {
    await file.close();
    await unlink(path);
  }
}
