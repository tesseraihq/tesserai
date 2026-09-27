import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { withProjectLock } from "./project-lock";

it("keeps another writer out, permits nested sync, and releases after failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "tesserai-lock-"));
  let release!: () => void;
  let entered!: () => void;
  const ready = new Promise<void>((r) => { entered = r; });
  try {
    const first = withProjectLock(dir, async () => {
      await withProjectLock(dir, async () => {});
      entered();
      await new Promise<void>((r) => { release = r; });
      throw new Error("render failed");
    });
    const failed = expect(first).rejects.toThrow("render failed");
    await ready;
    await expect(withProjectLock(dir, async () => {})).rejects.toThrow(/another tesserai command/);
    release();
    await failed;
    await expect(withProjectLock(dir, async () => "ok")).resolves.toBe("ok");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
