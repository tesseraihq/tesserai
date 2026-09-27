import { z } from "zod";
import { KEEPABLE, iconSettings, clampSteps, flattenTokens, includedComponents, getToken, isTokenRef, refPath, toHex, type DesignSystem } from "./index";

// What the user is looking at, so "make this softer" knows what "this" is: the section or
// component open in the builder, an element pointed at, and anything they @-mentioned.
const name = z.string().min(1).max(64);
export const Focus = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("section"), section: name }).strict(),
  z.object({ kind: z.literal("component"), component: name, variant: name.optional(), intent: name.optional(), size: name.optional(), state: name.optional() }).strict(),
  z.object({ kind: z.literal("element"), component: name, part: name, variant: name.optional(), intent: name.optional(), size: name.optional(), state: name.optional() }).strict(),
  // What's in the middle of the preview: one component when it's clear, a few when they share it;
  // with the section open in the panel, if one is.
  z.object({ kind: z.literal("screen"), components: z.array(name).min(1).max(4), section: name.optional() }).strict(),
]);
export type Focus = z.infer<typeof Focus>;
export const Focuses = z.union([Focus, z.array(Focus).max(8)]);

const refOrValue = (value: unknown) => (isTokenRef(value) ? refPath(value) : JSON.stringify(value));

// A compact, deterministic outline of a system for a model's context: everything needed to plan
// changes, a few thousand tokens at most. Details (every token, every recipe) are read on demand
// through the read tools. Deterministic output keeps prompt caching effective.
export function systemOutline(system: DesignSystem, focus?: Focus | readonly Focus[]): string {
  const lines: string[] = [`System "${system.name}", components built on ${system.base}.`, ""];

  lines.push("Palettes (name: seed color, steps, vibrancy, hand-overridden steps):");
  for (const [id, { target, config }] of Object.entries(system.generators)) {
    if (config.kind !== "colorScale") continue;
    const steps = clampSteps(config.steps);
    const pinned = [...flattenTokens(system.tokens)].filter(([p, t]) => p.startsWith(`${target}.`) && t.$meta?.pinned).map(([p]) => p.slice(target.length + 1));
    lines.push(`- ${id}: ${toHex(config.seed)}, ${steps} steps, vibrancy ${config.vibrancy ?? 1}${pinned.length > 0 ? `, overridden ${pinned.join(",")}` : ""}`);
  }

  // Conventions the team keeps its own way on purpose: not to be suggested again.
  if ((system.kept ?? []).length > 0) lines.push("", `Kept the team's own way on purpose (don't suggest changing these unless asked): ${system.kept!.map((k) => `${KEEPABLE[k.rule] ?? k.rule}${k.note === undefined ? "" : ` (${k.note})`}`).join("; ")}.`);
  lines.push("", "Intents (meaning: palette, icon):");
  for (const [name, def] of Object.entries(system.intents)) lines.push(`- ${name}: ${def.scale.replace(/^color\./, "")}${def.icon === undefined ? "" : `, ${def.icon}`}`);

  const icons = iconSettings(system);
  const spots = Object.entries(icons.spots);
  const own = Object.entries(icons.custom);
  lines.push(
    "",
    `Icons: ${icons.library}, ${icons.library === "phosphor" || icons.library === "remix" ? `weight ${icons.weight}` : `lines ${icons.stroke}px`}` +
      (own.length === 0 ? "" : `; the system's own: ${own.map(([id, i]) => `${id} (${i.name})`).join(", ")}`) +
      (spots.length === 0 ? "" : `; spots changed: ${spots.map(([k, v]) => `${k} → ${v}`).join(", ")}`),
  );
  lines.push("", "Surfaces (light / dark):");
  for (const name of ["page", "card", "raised", "overlay"]) {
    const token = getToken(system.tokens, `surface.${name}`);
    if (token === undefined) continue;
    const dark = token.$modes?.find((m) => m.selector.colorScheme === "dark")?.value;
    lines.push(`- ${name}: ${refOrValue(token.$value)} / ${dark === undefined ? "same" : refOrValue(dark)}`);
  }

  const type = system.generators["type"]?.config;
  const space = system.generators["space"]?.config;
  const radius = system.generators["radius"]?.config;
  const family = (role: string) => {
    const t = getToken(system.tokens, `font.family.${role}`);
    return t === undefined ? "unset" : Array.isArray(t.$value) ? String(t.$value[0]) : refOrValue(t.$value);
  };
  lines.push("", "Type:");
  lines.push(`- fonts: sans ${family("sans")}, heading ${family("heading")}, mono ${family("mono")}`);
  if (type?.kind === "typeScale") lines.push(`- scale: body ${type.base}px, ratio ${type.ratio}, ${type.stepsBelow} steps below and ${type.stepsAbove} above body (font.size.${type.stepsBelow + 1} is body), leading text ${type.leading.text} / display ${type.leading.display}`);
  if (space?.kind === "spacing") lines.push("", `Spacing: unit ${space.base}px, steps space.1-${space.multipliers.length} (×${space.multipliers.join(", ×")}), density compact ×${space.density.compact}, comfortable ×${space.density.comfortable}`);
  if (radius?.kind === "radiusScale") lines.push(`Radius: md ${radius.base}px (none, sm, md, lg, xl, 2xl, full)`);

  lines.push("", "Components (parts; axes as enabled options with the default first):");
  for (const anatomy of Object.values(includedComponents(system))) {
    const axes = (["variant", "intent", "size"] as const)
      .map((axis) => {
        const a = anatomy.axes[axis];
        if (a === undefined) return null;
        const rest = a.enabled.filter((o) => o !== a.default);
        return `${axis} ${[a.default, ...rest].join("|")}`;
      })
      .filter((x): x is string => x !== null);
    lines.push(`- ${anatomy.name}: parts ${anatomy.parts.join(", ")}${axes.length > 0 ? `; ${axes.join("; ")}` : ""}`);
  }
  if (system.excluded.length > 0) lines.push(`Left out (component.restore brings one back as it was): ${system.excluded.join(", ")}`);

  const focuses = focus === undefined ? [] : Array.isArray(focus) ? focus : [focus as Focus];
  if (focuses.length > 0) {
    lines.push("", "The user is looking at, or mentioned:");
    for (const f of focuses) {
      if (f.kind === "section") lines.push(`- the ${f.section} section`);
      else if (f.kind === "screen") {
        const open = f.section === undefined ? "" : ` (the ${f.section} section is open in the panel)`;
        lines.push(
          f.components.length === 1
            ? `- ${f.components[0]}, in the middle of the preview: what "it" or "this" means${open}`
            : `- in the middle of the preview, unclear which: ${f.components.join(", ")}${open}`,
        );
      } else {
        const selection = [f.variant, f.intent, f.size, f.state].filter((v) => v !== undefined).join(" ");
        lines.push(`- ${f.component}${f.kind === "element" ? ` ${f.part}` : ""}${selection === "" ? "" : ` (${selection})`}`);
      }
    }
  }
  return lines.join("\n");
}
