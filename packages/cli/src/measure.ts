import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyLook, fontList, LOOK_ROLES, type Look, type Scheme } from "@tesserai/core";

// `import --measure <url>`: a running page's look, for what code can't show (colors computed at
// runtime, plain CSS with no names). The person's own Chrome (or Chromium, Edge, Brave), driven over
// the DevTools protocol with Node's own WebSocket: nothing to download. Always a fresh temporary
// profile (no cookies, no extensions), always closed afterwards. Light is measured, then dark by
// emulating prefers-color-scheme (and a .dark class, when the page's stylesheets use one).

const CANDIDATES: Record<string, string[]> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/microsoft-edge"],
  win32: [
    `${process.env.PROGRAMFILES ?? "C:\\Program Files"}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)"}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
  ],
};

export function findBrowser(): string | undefined {
  const override = process.env.TESSERAI_CHROME;
  if (override !== undefined && override !== "") return override;
  return (CANDIDATES[process.platform] ?? []).find((p) => existsSync(p));
}

const NO_BROWSER =
  "Measuring a page needs Chrome, Chromium, Edge or Brave, and none was found (set TESSERAI_CHROME to its path). For a site on the web, Build from your website measures it without one: https://tesserai.design/app?open=build";

type Measured = Partial<Record<"page" | "text" | "primary" | "primaryForeground" | "danger" | "success" | "warning" | "border" | "card" | "muted", { value: string; where: string }>> & {
  font?: { value: string; where: string };
  heading?: { value: string; where: string };
  size?: { value: number; where: string };
  radius?: { value: number; where: string };
  darkClass?: boolean;
};

// Runs in the page. Reads roles from what's rendered: the page and body text, the primary and
// danger buttons (by their class or words, else the most colorful filled button), borders on cards
// and inputs, corners on buttons, fonts on body and headings.
const MEASURE = `(() => {
  const cs = (el) => getComputedStyle(el);
  const clear = (c) => !c || c === "transparent" || /rgba?\\([^)]*,\\s*0\\)$/.test(c) || / \\/ 0\\)$/.test(c);
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList.length ? "." + [...el.classList].slice(0, 2).join(".") : "");
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = cs(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = cs(e).backgroundColor; if (!clear(c)) return c; } return "rgb(255, 255, 255)"; };
  const out = {};
  const body = document.body;
  const pageBg = bgOf(body);
  out.page = { value: pageBg, where: "the page background" };
  out.text = { value: cs(body).color, where: "body text" };
  const fam = cs(body).fontFamily;
  if (fam) out.font = { value: fam, where: "body font" };
  out.size = { value: parseFloat(cs(body).fontSize), where: "body font size" };
  const h = document.querySelector("h1, h2");
  if (h && visible(h) && cs(h).fontFamily !== fam) out.heading = { value: cs(h).fontFamily, where: name(h) + " font" };
  const rgb = (c) => { const m = c.match(/[\\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; };
  const chroma = (c) => { const [r, g, b] = rgb(c); return Math.max(r, g, b) - Math.min(r, g, b); };
  const same = (a, b) => { const x = rgb(a), y = rgb(b); return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 6; };
  const clickables = [...document.querySelectorAll("button, a, [role=button], input[type=submit], input[type=button]")].filter(visible);
  const filled = clickables.filter((el) => { const b = cs(el).backgroundColor; return !clear(b) && !same(b, pageBg); });
  const label = (el) => (el.className + " " + (el.textContent || "") + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
  const isDanger = (el) => /danger|destructive|delete|remove|error/.test(label(el));
  const danger = filled.find(isDanger);
  if (danger) out.danger = { value: cs(danger).backgroundColor, where: name(danger) + " background" };
  const others = filled.filter((el) => !isDanger(el));
  const primary = others.find((el) => /primary|cta|main|submit/.test(el.className.toString().toLowerCase())) || others.sort((a, b) => chroma(cs(b).backgroundColor) - chroma(cs(a).backgroundColor))[0];
  if (primary) {
    out.primary = { value: cs(primary).backgroundColor, where: name(primary) + " background" };
    out.primaryForeground = { value: cs(primary).color, where: name(primary) + " text" };
    const r = parseFloat(cs(primary).borderTopLeftRadius);
    if (!isNaN(r)) out.radius = { value: Math.round(r * 100) / 100, where: name(primary) + " corners" };
  }
  const bordered = [...document.querySelectorAll("[class*=card], [class*=panel], input, select, textarea, hr, nav, header")].filter((el) => visible(el) && parseFloat(cs(el).borderTopWidth || cs(el).borderBottomWidth) > 0);
  for (const el of bordered) {
    const side = parseFloat(cs(el).borderTopWidth) > 0 ? cs(el).borderTopColor : cs(el).borderBottomColor;
    if (!clear(side)) { out.border = { value: side, where: name(el) + " border" }; break; }
  }
  if (!out.radius) {
    const control = [...document.querySelectorAll("input, select, textarea, [class*=card]")].find((el) => visible(el) && parseFloat(cs(el).borderTopLeftRadius) >= 0);
    if (control) out.radius = { value: parseFloat(cs(control).borderTopLeftRadius), where: name(control) + " corners" };
  }
  const card = [...document.querySelectorAll("[class*=card], [class*=panel]")].find((el) => visible(el) && !clear(cs(el).backgroundColor));
  if (card) out.card = { value: cs(card).backgroundColor, where: name(card) + " background" };
  const muted = [...document.querySelectorAll("[class*=muted], [class*=secondary], .lead, .meta, small, figcaption")].find((el) => visible(el) && !same(cs(el).color, out.text.value));
  if (muted) out.muted = { value: cs(muted).color, where: name(muted) + " text" };
  for (const [key, re] of [["success", /success|positive/], ["warning", /warning|caution/]]) {
    const el = [...document.querySelectorAll("[class]")].find((e) => visible(e) && re.test(e.className.toString().toLowerCase()));
    if (el) { const b = cs(el).backgroundColor; out[key] = { value: clear(b) || same(b, pageBg) ? cs(el).color : b, where: name(el) + (clear(b) ? " text" : " background") }; }
  }
  // A dark mode switched by class, when a stylesheet mentions one.
  try { out.darkClass = [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /\\.dark\\b|\\[data-theme=["']?dark/.test(r.cssText)); } catch { return false; } }); } catch { out.darkClass = false; }
  return out;
})()`;

type Cdp = { send: (method: string, params?: Record<string, unknown>, sessionId?: string) => Promise<Record<string, unknown>>; on: (event: string, fn: (params: Record<string, unknown>) => void) => void; close: () => void };

function connect(url: string): Promise<Cdp> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let next = 1;
    const pending = new Map<number, { ok: (v: Record<string, unknown>) => void; fail: (e: Error) => void }>();
    const listeners = new Map<string, ((p: Record<string, unknown>) => void)[]>();
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(String(e.data)) as { id?: number; result?: Record<string, unknown>; error?: { message: string }; method?: string; params?: Record<string, unknown> };
      if (msg.id !== undefined) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error !== undefined) p?.fail(new Error(msg.error.message));
        else p?.ok(msg.result ?? {});
      } else if (msg.method !== undefined) for (const fn of listeners.get(msg.method) ?? []) fn(msg.params ?? {});
    });
    ws.addEventListener("error", () => reject(new Error("couldn't talk to the browser")));
    ws.addEventListener("open", () =>
      resolve({
        send: (method, params = {}, sessionId) =>
          new Promise((ok, fail) => {
            const id = next++;
            pending.set(id, { ok, fail });
            ws.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
          }),
        on: (event, fn) => listeners.set(event, [...(listeners.get(event) ?? []), fn]),
        close: () => ws.close(),
      }),
    );
  });
}

const withTimeout = <T>(p: Promise<T>, ms: number, message: string) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

// `signal`: aborting (the CLI does on Ctrl-C) closes Chrome and removes its profile; this never
// exits the process itself.
export async function measureLook(url: string, options: { browser?: string | undefined; timeoutMs?: number; signal?: AbortSignal } = {}): Promise<Look> {
  const browser = options.browser ?? findBrowser();
  if (browser === undefined || !existsSync(browser)) throw new Error(NO_BROWSER);
  const timeout = options.timeoutMs ?? 20_000;
  const profile = mkdtempSync(join(tmpdir(), "tesserai-measure-"));
  let child: ChildProcess | undefined;
  let cdp: Cdp | undefined;
  // A process group of its own, to end it whole (not on Windows, which has none).
  const grouped = process.platform !== "win32";
  // Chrome writes to its profile until it has exited: wait for that (briefly) before removing it.
  // Its helpers (renderer, GPU, network) are processes of their own that outlive a killed browser
  // for a moment, or longer: Chrome runs in a process group of its own, and the group goes.
  const cleanup = async () => {
    cdp?.close();
    if (child !== undefined && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) => child!.once("exit", () => resolve()));
      if (grouped && child.pid !== undefined) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      } else child.kill("SIGKILL");
      await withTimeout(exited, 3_000, "").catch(() => {});
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  };
  const onAbort = () => void cleanup();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (options.signal?.aborted === true) throw new Error("stopped");
    child = spawn(
      browser,
      ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-gpu", "--disable-background-networking", "--disable-sync", "--disable-breakpad", "--disable-crash-reporter", "--mute-audio", "--hide-scrollbars", "--window-size=1280,900", "about:blank"],
      { stdio: ["ignore", "ignore", "pipe"], detached: grouped },
    );
    const endpoint = await withTimeout(
      new Promise<string>((resolve, reject) => {
        let err = "";
        child!.stderr!.on("data", (d) => {
          err += d;
          const m = /DevTools listening on (ws:\/\/\S+)/.exec(err);
          if (m !== null) resolve(m[1]!);
        });
        child!.on("error", () => reject(new Error(NO_BROWSER)));
        child!.on("exit", () => reject(new Error(`the browser stopped before it could measure: ${err.slice(-200)}`)));
      }),
      timeout,
      "the browser didn’t start in time",
    );
    cdp = await connect(endpoint);
    const { targetId } = (await cdp.send("Target.createTarget", { url: "about:blank" })) as { targetId: string };
    const { sessionId } = (await cdp.send("Target.attachToTarget", { targetId, flatten: true })) as { sessionId: string };
    const send = (m: string, p?: Record<string, unknown>) => cdp!.send(m, p, sessionId);
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    const loaded = new Promise<void>((resolve) => cdp!.on("Page.loadEventFired", () => resolve()));
    const nav = (await withTimeout(send("Page.navigate", { url }), timeout, `${url} didn’t answer. Is the app running?`)) as { errorText?: string };
    if (nav.errorText === "net::ERR_HTTP_RESPONSE_CODE_FAILURE") throw new Error(`${url} answered with an error, so there's no page to measure. Check the address.`);
    if (nav.errorText !== undefined && nav.errorText !== "") throw new Error(`${url} didn’t answer (${nav.errorText}). Is the app running?`);
    await withTimeout(loaded, 15_000, "").catch(() => {});
    // An error page isn't the app (a mistyped path, a crashed dev server).
    const status = ((await send("Runtime.evaluate", { expression: `performance.getEntriesByType("navigation")[0]?.responseStatus ?? 0`, returnByValue: true })) as { result: { value: number } }).result.value;
    if (status >= 400) throw new Error(`${url} answered ${status}, so there's no page to measure. Check the address.`);
    // Single-page apps render after load: give them a moment to settle.
    await new Promise((r) => setTimeout(r, 800));
    const measure = async () => ((await send("Runtime.evaluate", { expression: MEASURE, returnByValue: true })) as { result: { value: Measured } }).result.value;
    const light = await measure();
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await new Promise((r) => setTimeout(r, 300));
    let dark = await measure();
    if (!differs(light, dark) && light.darkClass === true) {
      await send("Runtime.evaluate", { expression: `document.documentElement.classList.add("dark"); document.documentElement.setAttribute("data-theme", "dark");` });
      await new Promise((r) => setTimeout(r, 300));
      dark = await measure();
    }
    const title = ((await send("Runtime.evaluate", { expression: "document.title + ' ' + location.pathname", returnByValue: true })) as { result: { value: string } }).result.value;
    await cdp.send("Browser.close").catch(() => {});
    return toLook(light, differs(light, dark) ? dark : undefined, /sign ?in|log ?in|login/i.test(title));
  } finally {
    options.signal?.removeEventListener("abort", onAbort);
    await cleanup();
  }
}

// Dark counts only when the page itself changed: its background or its text.
function differs(a: Measured, b: Measured): boolean {
  return a.page?.value !== b.page?.value || a.text?.value !== b.text?.value;
}

const ROLE: Record<string, string> = {
  page: LOOK_ROLES.background,
  text: LOOK_ROLES.foreground,
  primary: LOOK_ROLES.primary,
  primaryForeground: LOOK_ROLES.primaryForeground,
  danger: LOOK_ROLES.danger,
  success: LOOK_ROLES.success,
  warning: LOOK_ROLES.warning,
  border: LOOK_ROLES.border,
  card: LOOK_ROLES.card,
  muted: LOOK_ROLES.mutedText,
};

function toLook(light: Measured, dark: Measured | undefined, signIn: boolean): Look {
  const look = emptyLook();
  const put = (m: Measured, scheme: Scheme) => {
    for (const [key, path] of Object.entries(ROLE)) {
      const f = m[key as keyof typeof ROLE & keyof Measured] as { value: string; where: string } | undefined;
      if (f !== undefined) look.colors[scheme].set(path, { value: f.value, source: `rendered: ${f.where}`, name: f.where });
    }
  };
  put(light, "light");
  if (dark !== undefined) put(dark, "dark");
  const sans = light.font === undefined ? [] : fontList(light.font.value);
  if (sans.length > 0) look.fonts.sans = { value: sans, source: `rendered: ${light.font!.where}`, name: light.font!.where };
  const heading = light.heading === undefined ? [] : fontList(light.heading.value);
  if (heading.length > 0) look.fonts.heading = { value: heading, source: `rendered: ${light.heading!.where}`, name: light.heading!.where };
  if (light.size !== undefined && Number.isFinite(light.size.value)) look.baseSize = { value: light.size.value, source: `rendered: ${light.size.where}`, name: light.size.where };
  if (light.radius !== undefined && Number.isFinite(light.radius.value)) look.radius = { value: light.radius.value, source: `rendered: ${light.radius.where}`, name: light.radius.where };
  if (signIn) look.notes.push("The page measured looks like a sign-in page; the app's own pages may look different.");
  return look;
}
