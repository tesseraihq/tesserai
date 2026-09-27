// Maps token paths to CSS custom property names. Tailwind v4 namespaces are used where one exists
// so the same variables drive both the plain CSS and the Tailwind export.
const NAMESPACE: Record<string, string> = {
  color: "color",
  intent: "color",
  radius: "radius",
  shadow: "shadow",
  breakpoint: "breakpoint",
};

// Asked for every token in every mode on each edit (a slider tick emits the stylesheet again), and
// always the same answer for a path: kept, bounded by the paths a system has.
const names = new Map<string, string>();

export function cssVarName(path: string): string {
  let name = names.get(path);
  if (name === undefined) {
    name = varNameOf(path);
    if (names.size > 20_000) names.clear();
    names.set(path, name);
  }
  return name;
}

function varNameOf(path: string): string {
  const segments = path.split(".");
  const [head, second] = segments;
  if (head === "font" && second === "family") return `--font-${segments.slice(2).join("-")}`;
  if (head === "font" && second === "size") return `--text-${segments.slice(2).join("-")}`;
  if (head === "font" && second === "leading") return `--text-${segments.slice(2).join("-")}--line-height`;
  if (head === "font" && second === "weight") return `--font-weight-${segments.slice(2).join("-")}`;
  if (head === "motion" && second === "easing") return `--ease-${segments.slice(2).join("-")}`;
  if (head === "motion" && second === "duration") return `--duration-${segments.slice(2).join("-")}`;
  const ns = head === undefined ? undefined : NAMESPACE[head];
  if (ns !== undefined) return `--${ns}-${segments.slice(1).join("-")}`;
  return `--${segments.join("-")}`;
}

export function cssVarRef(path: string): string {
  return `var(${cssVarName(path)})`;
}
