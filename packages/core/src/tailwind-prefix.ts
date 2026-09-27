// A Tailwind class prefix (Tailwind v4's `@import "tailwindcss" prefix(acme)`): every utility is
// written acme:bg-primary, the prefix first, before any variant (acme:hover:bg-primary). Teams use
// one to tell their system's classes from anything else on the page. Tailwind takes lowercase
// letters only.

export const PREFIX_PATTERN = /^[a-z]+$/;

// Why a prefix can't be used, in words for the person; null when it can.
export function prefixProblem(prefix: string): string | null {
  if (prefix === "") return "a prefix needs at least one letter";
  if (prefix.length > 16) return "keep a prefix to 16 letters or fewer";
  return PREFIX_PATTERN.test(prefix) ? null : "Tailwind takes lowercase letters only (a–z) for a prefix, like acme";
}

// One class with the prefix in front, unless it already has it.
export function prefixClass(token: string, prefix: string): string {
  return token === "" || token.startsWith(`${prefix}:`) ? token : `${prefix}:${token}`;
}

// A class list ("flex hover:bg-primary") with each class prefixed, its spacing kept as written.
export function prefixClassList(list: string, prefix: string): string {
  return list.replace(/\S+/g, (token) => prefixClass(token, prefix));
}

// The prefix a stylesheet gives Tailwind (`@import "tailwindcss" prefix(acme);`), if any.
export function stylesheetPrefix(css: string): string | undefined {
  const found = /@import\s+(["'])tailwindcss(?:\/[\w.-]+)?\1[^;]*?\bprefix\(\s*([a-z]+)\s*\)/.exec(css);
  return found?.[2];
}
