import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { login, logout, tokenFor, type Http } from "./auth";

describe("tesserai login", () => {
  let config: string;
  beforeEach(async () => {
    config = await mkdtemp(join(tmpdir(), "tesserai-auth-"));
    process.env.TESSERAI_CONFIG_DIR = config;
  });
  afterEach(async () => {
    delete process.env.TESSERAI_CONFIG_DIR;
    await rm(config, { recursive: true, force: true });
  });

  // A server that says "pending" twice, then hands over a token.
  function server(outcome: "approve" | "deny") {
    let polls = 0;
    const calls: string[] = [];
    const http: Http = async (url, init) => {
      calls.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
      const json = async (): Promise<unknown> => {
        if (url.endsWith("/device/code")) return { device_code: "dev", user_code: "ABCD1234", verification_uri_complete: "/device?user_code=ABCD1234", interval: 5 };
        if (url.endsWith("/device/token")) {
          polls += 1;
          if (polls < 3) return { error: "authorization_pending" };
          return outcome === "approve" ? { access_token: "tok" } : { error: "access_denied" };
        }
        if (url.endsWith("/api/me")) return { user: { email: "ada@example.com" } };
        return {};
      };
      return { ok: true, status: 200, json };
    };
    return { http, calls };
  }

  it("waits for approval, then keeps the token where only you can read it", async () => {
    const lines: string[] = [];
    const { http } = server("approve");
    const result = await login({ host: "https://t.example", http, openBrowser: false, pollMs: 1, log: (l) => lines.push(l) });
    expect(result).toEqual({ host: "https://t.example", email: "ada@example.com" });
    expect(lines[0]).toBe("Open https://t.example/device?user_code=ABCD1234");
    expect(await tokenFor("https://t.example/some/path")).toBe("tok");
    expect((await stat(join(config, "credentials.json"))).mode & 0o777).toBe(0o600);
  });

  it("stops when the code is denied", async () => {
    await expect(login({ host: "https://t.example", http: server("deny").http, openBrowser: false, pollMs: 1 })).rejects.toThrow(/denied/);
    expect(await tokenFor("https://t.example")).toBeUndefined();
  });

  it("uses a sign-in saved for the address tesserai moved from", async () => {
    const { http } = server("approve");
    await login({ host: "https://tessera.andrewjkwak.workers.dev", http, openBrowser: false, pollMs: 1 });
    expect(await tokenFor("https://tesserai.design")).toBe("tok");
    expect(await tokenFor("https://t.example")).toBeUndefined();
    expect(await logout({ host: "https://tesserai.design", http })).toBe(true);
    expect(await tokenFor("https://tessera.andrewjkwak.workers.dev")).toBeUndefined();
  });

  it("signs out on the server and forgets the token", async () => {
    const { http, calls } = server("approve");
    await login({ host: "https://t.example", http, openBrowser: false, pollMs: 1 });
    expect(await logout({ host: "https://t.example", http })).toBe(true);
    expect(calls.at(-1)).toBe("POST /api/auth/sign-out");
    expect(JSON.parse(await readFile(join(config, "credentials.json"), "utf8"))).toEqual({ hosts: {} });
    expect(await logout({ host: "https://t.example", http })).toBe(false);
  });
});
