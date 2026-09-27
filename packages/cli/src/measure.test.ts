import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colorDistance, parseColor } from "@tesserai/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findBrowser, measureLook } from "./measure";

// `import --measure <url>` end to end: the person's own Chrome, a real page on localhost, the
// benchmark's pages whose look exists only when rendered. Written before measure.ts
// (docs/import-plan.md, v3 failure modes); skipped where no Chrome is installed.

const FIXTURES = fileURLToPath(new URL("../bench/import/fixtures", import.meta.url));
const DARK_PAGE = `<!doctype html><html><head><style>
  body { background: #fafaf9; color: #1c1917; font: 16px/1.5 "Inter", sans-serif; }
  .btn-primary { background: #2563eb; color: #fff; border-radius: 8px; padding: 8px 16px; border: 0; }
  @media (prefers-color-scheme: dark) { body { background: #0c0a09; color: #f5f5f4; } .btn-primary { background: #60a5fa; color: #0c0a09; } }
</style></head><body><h1>Hi</h1><button class="btn-primary">Go</button></body></html>`;

let server: Server;
let base = "";
const browser = findBrowser();

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname === "/dark/") {
      res.writeHead(200, { "content-type": "text/html" }).end(DARK_PAGE);
      return;
    }
    const [, fixture, ...rest] = url.pathname.split("/");
    try {
      const file = join(FIXTURES, fixture!, rest.join("/") || "index.html");
      const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[extname(file)] ?? "text/plain";
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": type }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const same = (a: string | undefined, b: string) => a !== undefined && colorDistance(parseColor(a)!, parseColor(b)!) < 1;

describe.skipIf(browser === undefined)("measuring a running page", () => {
  it("reads a look that's only in plain CSS rules, with where it measured each", async () => {
    const look = await measureLook(`${base}/m2-legacy-static/`, { browser });
    expect(same(look.colors.light.get("intent.primary.solid")?.value, "#c2410c")).toBe(true);
    expect(same(look.colors.light.get("intent.primary.solid-foreground")?.value, "#ffffff")).toBe(true);
    expect(same(look.colors.light.get("surface.page")?.value, "#fffbeb")).toBe(true);
    expect(same(look.colors.light.get("intent.neutral.text-strong")?.value, "#292524")).toBe(true);
    expect(same(look.colors.light.get("intent.neutral.border")?.value, "#e7e5e4")).toBe(true);
    expect(same(look.colors.light.get("intent.danger.solid")?.value, "#b91c1c")).toBe(true);
    expect(look.fonts.sans?.value[0]).toBe("Georgia");
    expect(look.baseSize?.value).toBe(17);
    expect(look.radius?.value).toBe(3);
    expect(look.colors.light.get("intent.primary.solid")?.source).toMatch(/^rendered: /);
  }, 60_000);

  it("reads colors computed by the page's own script", async () => {
    const look = await measureLook(`${base}/m1-runtime-computed/`, { browser });
    expect(same(look.colors.light.get("intent.primary.solid")?.value, "hsl(200 85% 42%)")).toBe(true);
    expect(same(look.colors.light.get("intent.danger.solid")?.value, "hsl(0 70% 45%)")).toBe(true);
  }, 60_000);

  it("reads dark mode when the page has it, and claims none when it doesn't", async () => {
    const dark = await measureLook(`${base}/dark/`, { browser });
    expect(same(dark.colors.dark.get("surface.page")?.value, "#0c0a09")).toBe(true);
    expect(same(dark.colors.dark.get("intent.primary.solid")?.value, "#60a5fa")).toBe(true);
    const light = await measureLook(`${base}/m2-legacy-static/`, { browser });
    expect(light.colors.dark.size).toBe(0);
  }, 90_000);

  it("won't measure an error page as the app", async () => {
    await expect(measureLook(`${base}/no-such-page/`, { browser })).rejects.toThrow(/answered (404|with an error)/);
  }, 60_000);

  it("says when nothing answers, in time, and never leaves Chrome running", async () => {
    const started = Date.now();
    await expect(measureLook("http://127.0.0.1:9/", { browser })).rejects.toThrow(/didn’t answer/);
    expect(Date.now() - started).toBeLessThan(25_000);
    const running = execFileSync("ps", ["-ax", "-o", "command"], { encoding: "utf8" });
    expect(running).not.toMatch(/tesserai-measure-/);
  }, 40_000);
});

describe("without a browser", () => {
  it("says so, and what else works", async () => {
    await expect(measureLook(`${base}/m2-legacy-static/`, { browser: "/nonexistent/chrome" })).rejects.toThrow(/Chrome.*Build from your website/s);
  });
});
