import { toCssOklch } from "../color";
import { readColor, readCssVariables } from "./css";
import { readStylesheet } from "./css-look";
import { LOOK_ROLES, lookToSystem, type ImportResult } from "./look";

// Imports a shadcn theme (globals.css): each variable is set exactly, for light and dark, on the
// tesserai role it plays, so the imported theme looks the same; the palettes behind them are
// generated from its colors, so everything else (new components, contrast fixes, dark mode where
// the file has none) still works.

// What an import made and what it says about it (see look.ts).
export type ImportReport = ImportResult;

export type ShadcnRole = { op: "role"; intent: string; role: string } | { op: "surface"; surface: string } | { op: "token"; path: string };

// shadcn's variables and the tesserai role each plays.
export const SHADCN_ROLES: Record<string, ShadcnRole> = {
  background: { op: "surface", surface: "page" },
  card: { op: "surface", surface: "card" },
  popover: { op: "surface", surface: "overlay" },
  foreground: { op: "role", intent: "neutral", role: "text-strong" },
  primary: { op: "role", intent: "primary", role: "solid" },
  "primary-foreground": { op: "role", intent: "primary", role: "solid-foreground" },
  secondary: { op: "role", intent: "neutral", role: "subtle" },
  "secondary-foreground": { op: "role", intent: "neutral", role: "subtle-foreground" },
  accent: { op: "role", intent: "neutral", role: "subtle-hover" },
  muted: { op: "role", intent: "neutral", role: "background" },
  "muted-foreground": { op: "role", intent: "neutral", role: "text" },
  border: { op: "role", intent: "neutral", role: "border" },
  input: { op: "role", intent: "neutral", role: "border-strong" },
  ring: { op: "role", intent: "primary", role: "focus-ring" },
  destructive: { op: "role", intent: "danger", role: "solid" },
  "destructive-foreground": { op: "role", intent: "danger", role: "solid-foreground" },
  "chart-1": { op: "token", path: "chart.1" },
  "chart-2": { op: "token", path: "chart.2" },
  "chart-3": { op: "token", path: "chart.3" },
  "chart-4": { op: "token", path: "chart.4" },
  "chart-5": { op: "token", path: "chart.5" },
};

// Same color as their neighbour in every shadcn theme, so they carry nothing of their own.
const SAME_AS: Record<string, string> = { "card-foreground": "foreground", "popover-foreground": "foreground", "accent-foreground": "secondary-foreground" };

// The token a role reads from.
export function shadcnRolePath(role: ShadcnRole): string {
  if (role.op === "surface") return `surface.${role.surface}`;
  if (role.op === "token") return role.path;
  return `intent.${role.intent}.${role.role}`;
}

// shadcn's sidebar variables, from the roles they play (a theme's own sidebar colors aren't
// imported: the sidebar follows the system).
const SHADCN_SIDEBAR: Record<string, ShadcnRole> = {
  sidebar: { op: "role", intent: "neutral", role: "background" },
  "sidebar-foreground": { op: "role", intent: "neutral", role: "text-strong" },
  "sidebar-primary": { op: "role", intent: "primary", role: "solid" },
  "sidebar-primary-foreground": { op: "role", intent: "primary", role: "solid-foreground" },
  "sidebar-accent": { op: "role", intent: "neutral", role: "subtle-hover" },
  "sidebar-accent-foreground": { op: "role", intent: "neutral", role: "subtle-foreground" },
  "sidebar-border": { op: "role", intent: "neutral", role: "border" },
  "sidebar-ring": { op: "role", intent: "primary", role: "focus-ring" },
};

// Every shadcn color variable and the token it's written from on export: the same table import
// reads with, so a theme that comes in goes back out unchanged. The foregrounds shadcn keeps
// apart but tesserai shares come from their neighbour's token.
export function shadcnExportPaths(): [string, string][] {
  const out: [string, string][] = [];
  for (const [name, role] of Object.entries(SHADCN_ROLES)) out.push([name, shadcnRolePath(role)]);
  for (const [name, same] of Object.entries(SAME_AS)) out.push([name, shadcnRolePath(SHADCN_ROLES[same]!)]);
  for (const [name, role] of Object.entries(SHADCN_SIDEBAR)) out.push([name, shadcnRolePath(role)]);
  return out;
}

export function describeShadcnRole(role: ShadcnRole): string {
  if (role.op === "surface") return `the ${role.surface} surface`;
  if (role.op === "token") return `chart color ${role.path.split(".")[1]}`;
  return `${role.intent} ${role.role.replace(/-/g, " ")}`;
}

export function importShadcnTheme(css: string, name = "Imported theme", file = "globals.css"): ImportResult | { error: string } {
  const vars = readCssVariables(css);
  if (vars.light.size === 0 && vars.dark.size === 0) return { error: "no CSS variables found under :root or .dark" };
  const look = readStylesheet(css, file);
  if (!look.colors.light.has(LOOK_ROLES.primary) && !look.colors.dark.has(LOOK_ROLES.primary)) return { error: "there's no --primary color to build the system from" };
  // Foregrounds shadcn keeps apart but tesserai shares with a neighbour: said when they differ.
  for (const [key, same] of Object.entries(SAME_AS)) {
    const a = vars.light.get(key);
    const b = vars.light.get(same);
    if (a !== undefined && b !== undefined && readColor(a) !== undefined && toCssOklch(readColor(a)!) !== toCssOklch(readColor(b) ?? readColor(a)!)) {
      look.skipped.push({ name: `--${key}`, why: `differs from --${same}; tesserai uses one text color on surfaces` });
    }
  }
  return lookToSystem(look, name);
}
