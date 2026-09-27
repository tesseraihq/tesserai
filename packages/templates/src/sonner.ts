import { cssVarRef, isTokenRef, refPath, resolveRecipe, type Anatomy } from "@tesserai/core";
import { NATIVE_STATES } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// Sonner's classes and colours, which every framework's Toaster prints from (vue-sonner and
// svelte-sonner take the same toastOptions.classes map, as `classes` in the Svelte port and
// `classNames` elsewhere): Sonner renders no data-slot of ours, so these are its toastOptions
// class names by key, its CSS variables, and the classes on the Toaster and each kind's icon.
export function sonnerPieces(anatomy: Anatomy) {
  const toast = resolveRecipe(anatomy, {})["toast"]?.base ?? {};
  const v = (ref: string | undefined, fallback: string) => (ref !== undefined && isTokenRef(ref) ? cssVarRef(refPath(ref)) : fallback);
  // Sonner's own stylesheet outranks utility classes, so the rest of the styles are marked important.
  const important = (classes: string[]) => classes.map((c) => `${c}!`);
  const part = (name: string, extra: string[] = []) => important(flatClasses(anatomy, name, { states: NATIVE_STATES }, extra));
  return {
    toaster: ["toaster", "group"],
    // Each kind's icon, the loading one spinning.
    icon: ["size-4"],
    loadingIcon: ["size-4", "animate-spin"],
    vars: {
      "--normal-bg": v(toast.background, "var(--color-neutral-background)"),
      "--normal-text": v(toast.foreground, "inherit"),
      "--normal-border": v(toast.border, "transparent"),
      "--border-radius": v(toast.radius, "0.5rem"),
      "--width": cssVarRef("sonner.width"),
    },
    classNames: {
      toast: part("toast"),
      title: part("title"),
      description: part("description"),
      actionButton: part("action"),
      cancelButton: part("cancel"),
      // Each kind's icon takes its meaning's color.
      success: ["[&_[data-icon]]:text-success-text!"],
      error: ["[&_[data-icon]]:text-danger-text!"],
      warning: ["[&_[data-icon]]:text-warning-text!"],
      info: ["[&_[data-icon]]:text-info-text!"],
    },
  };
}

// The icon for each kind of toast, by Sonner's name for it.
export const SONNER_ICONS = [
  ["success", "CircleCheckIcon"],
  ["info", "InfoIcon"],
  ["warning", "TriangleAlertIcon"],
  ["error", "OctagonXIcon"],
  ["loading", "Loader2Icon"],
] as const;

// Sonner, the same file on every library as in shadcn, without next-themes: colors come from the
// system's tokens, which already follow light and dark. Sonner's own stylesheet outranks utility
// classes, so colors go in through its variables and the rest of the styles are marked important.
export function renderSonner(anatomy: Anatomy): string {
  const p = sonnerPieces(anatomy);
  const icon = (name: string, kind: string) => `<${name} className=${classString(kind === "loading" ? p.loadingIcon : p.icon)} />`;

  return `import * as React from "react";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

// Render once near the root, then call toast("Saved") (or toast.success, toast.error…) from
// anywhere; import toast from "sonner".
function Toaster({ style, toastOptions, ...props }: ToasterProps) {
  return (
    <Sonner
      className=${classString(p.toaster)}
      icons={{
${SONNER_ICONS.map(([kind, name]) => `        ${kind}: ${icon(name, kind)},`).join("\n")}
      }}
      style={
        {
${Object.entries(p.vars).map(([k, val]) => `          ${JSON.stringify(k)}: ${JSON.stringify(val)},`).join("\n")}
          ...style,
        } as React.CSSProperties
      }
      toastOptions={{
        ...toastOptions,
        classNames: {
${Object.entries(p.classNames).map(([k, val]) => `          ${k}: ${classString(val)},`).join("\n")}
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
`;
}
