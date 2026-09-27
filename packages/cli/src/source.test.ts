import { PRESETS, type DesignSystem } from "@tesserai/core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { init } from "./init";
import { readSource, shareApiUrl, type Fetch } from "./source";
import { sync } from "./sync";

const LINK = "https://tesserai.example/s/AbCdEf123456";

describe("shareApiUrl", () => {
  it("turns a share link into its API address", () => {
    expect(shareApiUrl(LINK)).toBe("https://tesserai.example/api/share/AbCdEf123456");
    expect(shareApiUrl("https://tesserai.example/s/short")).toBeNull();
    expect(shareApiUrl("./acme.tesserai.json")).toBeNull();
  });
});

describe("following a share link", () => {
  let dir: string;
  let project: string;
  let served: DesignSystem | "gone" | "down";
  // The latest release, when the system has one.
  let released: { number: number; notes: string; body: DesignSystem } | null = null;

  const fakeFetch: Fetch = async (url) => {
    if (served === "down") throw new Error("getaddrinfo ENOTFOUND");
    if (url === "https://tesserai.example/api/share/AbCdEf123456/releases/latest") {
      const r = released;
      return r === null ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => r };
    }
    expect(url).toBe("https://tesserai.example/api/share/AbCdEf123456");
    if (served === "gone") return { ok: false, status: 404, json: async () => ({}) };
    const body = served;
    return { ok: true, status: 200, json: async () => ({ name: body.name, body }) };
  };

  function named(name: string, radius: number): DesignSystem {
    const system = PRESETS[0]!.build();
    system.name = name;
    const config = system.generators["radius"]?.config;
    if (config?.kind === "radiusScale") config.base = radius;
    return system;
  }

  beforeEach(async () => {
    released = null;
    dir = await mkdtemp(join(tmpdir(), "tesserai-link-"));
    project = join(dir, "app");
    await mkdir(join(project, "src"), { recursive: true });
    await writeFile(join(project, "package.json"), JSON.stringify({ devDependencies: { vite: "^8", tailwindcss: "^4" } }));
    await writeFile(join(project, "tsconfig.json"), JSON.stringify({ compilerOptions: { paths: { "@/*": ["./src/*"] } } }));
    served = named("Northwind", 6);
    await init({ bundlePath: LINK, dir: project, base: "base-ui", install: false, fetch: fakeFetch });
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it("installs from the link and remembers it", async () => {
    expect(JSON.parse(await readFile(join(project, "tesserai", "source.json"), "utf8"))).toEqual({ link: LINK });
    expect(JSON.parse(await readFile(join(project, "tesserai", "design-system.json"), "utf8")).name).toBe("Northwind");
  });

  it("pulls the latest shared version on sync", async () => {
    served = named("Northwind 2", 12);
    const result = await sync({ dir: project, force: false, fetch: fakeFetch });
    expect(JSON.parse(await readFile(join(project, "tesserai", "design-system.json"), "utf8")).name).toBe("Northwind 2");
    expect(result.files.some((f) => f.outcome === "updated")).toBe(true);
  });

  it("keeps working from the local copy when the link can't be reached", async () => {
    served = "down";
    const result = await sync({ dir: project, force: false, fetch: fakeFetch });
    expect(result.warnings.join("\n")).toMatch(/couldn't reach .*used the copy in tesserai\/design-system.json/);
    served = "gone";
    const again = await sync({ dir: project, force: false, fetch: fakeFetch });
    expect(again.warnings.join("\n")).toMatch(/isn't shared any more/);
  });

  it("stops following the link when a file is adopted", async () => {
    const file = join(dir, "local.tesserai.json");
    await writeFile(file, JSON.stringify(named("Local", 4)));
    await sync({ dir: project, bundlePath: file, force: false, fetch: fakeFetch });
    await expect(readFile(join(project, "tesserai", "source.json"), "utf8")).rejects.toThrow();
  });
  it("installs a shared system's latest release, with its notes, unless asked for what's current", async () => {
    served = named("Current", 12);
    released = { number: 3, notes: "Rounder corners\nNew danger color", body: named("Released", 6) };
    await init({ bundlePath: LINK, dir: project, install: false, fetch: fakeFetch });
    expect(JSON.parse(await readFile(join(project, "tesserai/design-system.json"), "utf8")).name).toBe("Released");
    const result = await sync({ dir: project, force: false, fetch: fakeFetch });
    expect(result.release).toEqual({ number: 3, notes: "Rounder corners\nNew danger color" });
    const live = await sync({ dir: project, force: false, fetch: fakeFetch, live: true });
    expect(live.release).toBeNull();
    expect(JSON.parse(await readFile(join(project, "tesserai/design-system.json"), "utf8")).name).toBe("Current");
  });
});

describe("private links and releases", () => {
  const PRIVATE = "https://tesserai.example/systems/0b7c5c1e-4a7e-4a39-9d7e-6a3b2f1c9d10";
  let config: string;
  beforeEach(async () => {
    config = await mkdtemp(join(tmpdir(), "tesserai-cfg-"));
    process.env.TESSERAI_CONFIG_DIR = config;
    await writeFile(join(config, "credentials.json"), JSON.stringify({ hosts: { "https://tesserai.example": { token: "tok", email: "a@example.com" } } }));
  });
  afterEach(async () => {
    delete process.env.TESSERAI_CONFIG_DIR;
    await rm(config, { recursive: true, force: true });
  });

  function server(releases: boolean) {
    const seen: string[] = [];
    const current = PRESETS[0]!.build();
    current.name = "Current";
    const released = PRESETS[0]!.build();
    released.name = "Release 4";
    const http: Fetch = async (url, init) => {
      seen.push(`${new URL(url).pathname} ${init?.headers?.authorization ?? ""}`);
      if (url.endsWith("/releases/latest")) {
        return releases ? { ok: true, status: 200, json: async () => ({ number: 4, body: released }) } : { ok: false, status: 404, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({ body: current }) };
    };
    return { http, seen };
  }

  it("installs the latest release, with the saved token", async () => {
    const { http, seen } = server(true);
    const result = await readSource(PRIVATE, http);
    expect([result.system.name, result.release]).toEqual(["Release 4", 4]);
    expect(seen).toEqual(["/api/systems/0b7c5c1e-4a7e-4a39-9d7e-6a3b2f1c9d10/releases/latest Bearer tok"]);
  });

  it("takes the current version with --live, or when there are no releases", async () => {
    expect((await readSource(PRIVATE, server(true).http, { live: true })).system.name).toBe("Current");
    expect((await readSource(PRIVATE, server(false).http)).system.name).toBe("Current");
  });

  it("asks you to sign in when there's no token", async () => {
    await rm(join(config, "credentials.json"));
    await expect(readSource(PRIVATE, server(true).http)).rejects.toThrow(/npx @tesserai\/cli login https:\/\/tesserai.example/);
  });
});

it.each([403, 429, 500, 503])(
  "does not substitute unreleased work when release lookup returns %s",
  async (status) => {
    const seen: string[] = [];
    const fetch: Fetch = async (url) => {
      seen.push(url);
      return url.endsWith("/releases/latest")
        ? { ok: false, status, json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ body: PRESETS[0]!.build() }) };
    };
    await expect(readSource(LINK, fetch)).rejects.toThrow(String(status));
    expect(seen).toHaveLength(1);
  },
);

it("bounds a stalled source request and aborts its transport", async () => {
  let signal: AbortSignal | undefined;
  const fetch: Fetch = async (_url, init) => { signal = init?.signal; return new Promise(() => {}); };
  await expect(readSource(LINK, fetch, { timeoutMs: 25 })).rejects.toThrow(/timed out/);
  expect(signal?.aborted).toBe(true);
});

it("cancels a source request while reading the response body", async () => {
  const controller = new AbortController();
  const fetch: Fetch = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });
  const result = readSource(LINK, fetch, { signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toThrow(/cancelled/);
});
