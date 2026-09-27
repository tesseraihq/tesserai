import { PRESETS } from "@tesserai/core";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Http } from "./auth";
import { scan } from "./scan";
import { uploadOf, uploadScan } from "./scan-upload";

const system = PRESETS[0]!.build();
const ID = "0f0e0d0c-0b0a-4908-8706-050403020100";
let dir: string;
let config: string;
const saved = process.env["TESSERAI_CONFIG_DIR"];

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "tesserai-upload-"));
  config = await mkdtemp(join(tmpdir(), "tesserai-upload-config-"));
  process.env["TESSERAI_CONFIG_DIR"] = config;
  await mkdir(join(dir, "src"), { recursive: true });
  await mkdir(join(dir, "tesserai"), { recursive: true });
  await writeFile(join(dir, "package.json"), JSON.stringify({ name: "acme-web" }));
  await writeFile(join(dir, "src", "App.tsx"), [`import { Button } from "@/components/ui/button";`, ...[1, 2, 3].map((i) => `export const A${i} = () => <Button className="rounded-none">Secret ${i}</Button>;`)].join("\n"));
});
afterAll(async () => {
  if (saved === undefined) delete process.env["TESSERAI_CONFIG_DIR"];
  else process.env["TESSERAI_CONFIG_DIR"] = saved;
  await rm(dir, { recursive: true, force: true });
  await rm(config, { recursive: true, force: true });
});

const server = (status: number, body: unknown = {}) => {
  const calls: { url: string; auth?: string; body: string }[] = [];
  const http: Http = async (url, init) => {
    calls.push({ url, ...(init?.headers?.["authorization"] === undefined ? {} : { auth: init.headers["authorization"] }), body: init?.body ?? "" });
    return { ok: status < 300, status, json: async () => body };
  };
  return { http, calls };
};

describe("scan --upload", () => {
  it("sends the aggregate only: counts, kinds and classes, no source and no paths", async () => {
    const upload = uploadOf(await scan(dir, system), "acme-web");
    const sent = JSON.stringify(upload);
    expect(upload.overrides).toEqual([{ component: "button", count: 3, kinds: { radius: 3 }, classes: [{ class: "rounded-none", count: 3 }] }]);
    expect(sent).not.toMatch(/App\.tsx|Secret|"line"/);
    expect(upload.components[0]).toMatchObject({ name: "button", uses: 3, files: 1 });
  });

  it("needs the project's account link and a sign-in, and says so", async () => {
    const { http } = server(201);
    const result = await scan(dir, system);
    await expect(uploadScan({ dir, result, fetch: http })).rejects.toThrow(/doesn't follow a system in an account/);
    await writeFile(join(dir, "tesserai", "source.json"), JSON.stringify({ link: "https://tesserai.example/s/AbCdEf123456" }));
    await expect(uploadScan({ dir, result, fetch: http })).rejects.toThrow(/share link, which anyone can open/);
    await writeFile(join(dir, "tesserai", "source.json"), JSON.stringify({ link: `https://tesserai.example/systems/${ID}` }));
    await expect(uploadScan({ dir, result, fetch: http })).rejects.toThrow(/npx @tesserai\/cli login/);
  });

  it("posts to the system's scans with the account's token, and names each refusal", async () => {
    await writeFile(join(dir, "tesserai", "source.json"), JSON.stringify({ link: `https://tesserai.example/systems/${ID}` }));
    await writeFile(join(config, "credentials.json"), JSON.stringify({ hosts: { "https://tesserai.example": { token: "tok", email: "a@example.com" } } }));
    const result = await scan(dir, system);
    const ok = server(201, { id: "s1" });
    expect(await uploadScan({ dir, result, fetch: ok.http })).toEqual({ url: `https://tesserai.example/systems/${ID}`, project: "acme-web" });
    expect(ok.calls.map((c) => [c.url, c.auth])).toEqual([[`https://tesserai.example/api/systems/${ID}/scans`, "Bearer tok"]]);
    expect(JSON.parse(ok.calls[0]!.body)).toMatchObject({ format: "tesserai/scan@1", project: "acme-web" });
    await expect(uploadScan({ dir, result, fetch: server(402, { message: "keeping scans in the builder is part of Pro" }).http })).rejects.toThrow(/part of Pro/);
    await expect(uploadScan({ dir, result, fetch: server(404).http })).rejects.toThrow(/isn't in your account/);
    await expect(uploadScan({ dir, result, fetch: server(401).http })).rejects.toThrow(/signed out/);
  });
});
