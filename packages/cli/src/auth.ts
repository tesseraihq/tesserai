import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { env } from "./env";

// Signing the CLI in to a tesserai server, for systems kept privately in an account. The browser
// shows a code; once a signed-in person approves it, the CLI is given a session token.

export const DEFAULT_HOST = "https://tesserai.design";
// Addresses the server has moved from. One server answers at both, so a sign-in saved for the old
// address works at the new one.
const MOVED_FROM: Record<string, string> = { "https://tesserai.design": "https://tessera.andrewjkwak.workers.dev" };
const CLIENT_ID = "tesserai-cli";

export type HttpInit = { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal };
export type Http = (url: string, init?: HttpInit) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Credentials = { hosts: Record<string, { token: string; email: string }> };

function credentialsPath(folder = "tesserai"): string {
  return join(env("CONFIG_DIR") ?? join(homedir(), ".config", folder), "credentials.json");
}

// Sign-ins saved before the rename are in ~/.config/tessera; read there until the next save moves them.
async function readCredentials(): Promise<Credentials> {
  for (const path of [credentialsPath(), credentialsPath("tessera")]) {
    try {
      return JSON.parse(await readFile(path, "utf8")) as Credentials;
    } catch {
      // Not there; the next place, or none.
    }
  }
  return { hosts: {} };
}

async function writeCredentials(credentials: Credentials): Promise<void> {
  const path = credentialsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(credentials, null, 2) + "\n", { mode: 0o600 });
  // The file holds session tokens: only its owner may read it.
  await chmod(path, 0o600);
}

export function origin(host: string): string {
  return new URL(host).origin;
}

// The saved sign-in for a host: its own, or one from the address it moved from.
function savedFor(credentials: Credentials, host: string): string | undefined {
  const at = origin(host);
  if (credentials.hosts[at] !== undefined) return at;
  const before = MOVED_FROM[at];
  return before !== undefined && credentials.hosts[before] !== undefined ? before : undefined;
}

export async function tokenFor(host: string): Promise<string | undefined> {
  const credentials = await readCredentials();
  const key = savedFor(credentials, host);
  return key === undefined ? undefined : credentials.hosts[key]!.token;
}

export function openInBrowser(url: string) {
  const [command, args] =
    process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  try {
    spawn(command, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {
    // The link is printed as well; opening it is only a convenience.
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type LoginOptions = { host?: string; http?: Http; log?: (line: string) => void; openBrowser?: boolean; pollMs?: number };

export async function login(options: LoginOptions = {}): Promise<{ host: string; email: string }> {
  const http: Http = options.http ?? fetch;
  const log = options.log ?? (() => {});
  const host = origin(options.host ?? DEFAULT_HOST);
  const post = (path: string, body: unknown) =>
    http(`${host}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const res = await post("/api/auth/device/code", { client_id: CLIENT_ID });
  if (!res.ok) throw new Error(`${host} didn't start a sign-in (${res.status})`);
  const code = (await res.json()) as { device_code: string; user_code: string; verification_uri_complete: string; interval?: number; expires_in?: number };
  const link = new URL(code.verification_uri_complete, host).toString();
  log(`Open ${link}`);
  log(`and check it shows the code ${code.user_code}. Waiting for you to approve it…`);
  if (options.openBrowser !== false) openInBrowser(link);

  let wait = options.pollMs ?? (code.interval ?? 5) * 1000;
  const deadline = Date.now() + (code.expires_in ?? 600) * 1000;
  while (Date.now() < deadline) {
    await sleep(wait);
    const polled = await post("/api/auth/device/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: code.device_code,
      client_id: CLIENT_ID,
    });
    const body = (await polled.json()) as { access_token?: string; error?: string };
    if (body.access_token !== undefined) {
      const me = await http(`${host}/api/me`, { headers: { authorization: `Bearer ${body.access_token}` } });
      const email = ((await me.json()) as { user?: { email?: string } | null }).user?.email ?? "your account";
      const credentials = await readCredentials();
      credentials.hosts[host] = { token: body.access_token, email };
      await writeCredentials(credentials);
      return { host, email };
    }
    if (body.error === "slow_down") wait += 5000;
    else if (body.error === "access_denied") throw new Error("the sign-in was denied in the browser");
    else if (body.error === "expired_token") break;
    else if (body.error !== "authorization_pending") throw new Error(`sign-in failed: ${body.error ?? polled.status}`);
  }
  throw new Error("the code expired before it was approved; run npx @tesserai/cli login again");
}

export async function logout(options: { host?: string; http?: Http } = {}): Promise<boolean> {
  const host = origin(options.host ?? DEFAULT_HOST);
  const credentials = await readCredentials();
  const key = savedFor(credentials, host);
  if (key === undefined) return false;
  const entry = credentials.hosts[key]!;
  // Ends the session on the server too, so a copied token stops working.
  try {
    await (options.http ?? fetch)(`${host}/api/auth/sign-out`, {
      method: "POST",
      headers: { authorization: `Bearer ${entry.token}`, "content-type": "application/json" },
      body: "{}",
    });
  } catch {
    // Offline: the local token is still forgotten.
  }
  delete credentials.hosts[key];
  await writeCredentials(credentials);
  return true;
}
