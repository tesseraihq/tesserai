import { parseBundle, type DesignSystem } from "@tesserai/core";
import { readFile } from "node:fs/promises";

// Where a design system comes from: a bundle file, or a share link from the tesserai builder.
// A project installed from a link remembers it, so `npx @tesserai/cli sync` can pull the latest version.

import { DEFAULT_HOST, tokenFor, type Http } from "./auth";

export type Fetch = Http;

// https://host/s/<slug> → https://host/api/share/<slug> (anyone can read it);
// https://host/systems/<id> → https://host/api/systems/<id> (needs tesserai login).
export function sourceApi(input: string): { api: string; origin: string; private: boolean } | null {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const slug = /^\/s\/([0-9A-Za-z]{12})\/?$/.exec(url.pathname)?.[1];
  if (slug !== undefined) return { api: `${url.origin}/api/share/${slug}`, origin: url.origin, private: false };
  const id = /^\/systems\/([0-9a-f-]{36})\/?$/.exec(url.pathname)?.[1];
  if (id !== undefined) return { api: `${url.origin}/api/systems/${id}`, origin: url.origin, private: true };
  return null;
}

export function shareApiUrl(input: string): string | null {
  const source = sourceApi(input);
  return source === null || source.private ? null : source.api;
}

export function isLink(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function parsed(raw: unknown, from: string): DesignSystem {
  const result = parseBundle(raw);
  if (!result.ok) throw new Error(`${from} is not a tesserai design system (${result.problem})`);
  return result.system;
}

// A system with releases installs its latest release (shared or private); `live` takes what's
// current instead.
async function readSourceWithinDeadline(
  input: string,
  fetchImpl: Fetch = fetch,
  options: { live?: boolean; signal?: AbortSignal } = {},
): Promise<{ system: DesignSystem; link: string | null; release: number | null; notes: string | null }> {
  if (!isLink(input)) {
    let raw: unknown;
    try {
      raw = JSON.parse(await readFile(input, "utf8"));
    } catch (e) {
      throw new Error(`couldn't read ${input}: ${e instanceof Error ? e.message : String(e)}`);
    }
    return { system: parsed(raw, input), link: null, release: null, notes: null };
  }
  const source = sourceApi(input);
  if (source === null) throw new Error(`${input} isn't a tesserai link (a shared one looks like https://…/s/AbCdEf123456)`);
  const login = `run: npx @tesserai/cli login${source.origin === DEFAULT_HOST ? "" : ` ${source.origin}`}`;
  const token = source.private ? await tokenFor(source.origin) : undefined;
  if (source.private && token === undefined) throw new Error(`${input} is private to its owner's account; ${login}`);
  const init = token === undefined ? undefined : { headers: { authorization: `Bearer ${token}` } };
  const get = async (url: string) => {
    try {
      return await fetchImpl(url, { ...init, ...(options.signal === undefined ? {} : { signal: options.signal }) });
    } catch (e) {
      throw new Error(`couldn't reach ${input}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  if (!options.live) {
    const released = await get(`${source.api}/releases/latest`);
    if (released.ok) {
      const body = (await released.json()) as { number: number; notes?: string | null; body?: unknown };
      return { system: parsed(body.body, input), link: input, release: body.number, notes: body.notes ?? null };
    }
    // No releases yet (404): the current version is all there is.
    if (released.status === 401) throw new Error(`you're signed out of ${source.origin}; ${login}`);
    if (released.status !== 404)
      throw new Error(`${input} release lookup answered ${released.status}`);
  }
  const res = await get(source.api);
  if (res.status === 401) throw new Error(`you're signed out of ${source.origin}; ${login}`);
  if (res.status === 404) {
    throw new Error(source.private ? `${input} isn't in the account you're signed in to` : `${input} isn't shared any more; ask its owner to turn sharing back on`);
  }
  if (!res.ok) throw new Error(`${input} answered ${res.status}`);
  const body = (await res.json()) as { body?: unknown };
  return { system: parsed(body.body, input), link: input, release: null, notes: null };
}


// One deadline covers both HTTP requests and response bodies. Abort the real transport, while
// racing also bounds custom adapters that do not honor AbortSignal.
export async function readSource(input: string, fetchImpl: Fetch = fetch, options: { live?: boolean; timeoutMs?: number; signal?: AbortSignal } = {}) {
  if (options.signal?.aborted) throw new Error("source request cancelled");
  const controller = new AbortController();
  let rejectDeadline!: (error: Error) => void;
  const deadline = new Promise<never>((_, reject) => { rejectDeadline = reject; });
  const cancel = () => { controller.abort(); rejectDeadline(new Error("source request cancelled")); };
  options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    controller.abort();
    rejectDeadline(new Error(`source request timed out after ${options.timeoutMs ?? 10_000}ms; check the connection and retry`));
  }, options.timeoutMs ?? 10_000);
  timer.unref();
  try {
    return await Promise.race([readSourceWithinDeadline(input, fetchImpl, { ...(options.live === undefined ? {} : { live: options.live }), signal: controller.signal }), deadline]);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

// tesserai/source.json: the share link the project follows, if any.
export type SourceFile = { link: string };
