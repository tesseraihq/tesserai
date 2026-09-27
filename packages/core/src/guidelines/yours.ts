import { checkContrast, summarizeContrast } from "../contrast";
import { includedComponents, type DesignSystem } from "../system";
import { flattenTokens } from "../tokens";
import { componentName } from "../component-groups";
import { isTarget, measure, ms, px, round, TOUCH, value, type Flat } from "./review";

// "In your system": a guideline next to this system's own numbers, worked out from the system (no
// AI), so the guides teach with what's on screen. Undefined where a guideline has nothing to
// measure here.

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const SIZE_ORDER = ["xs", "sm", "md", "lg", "xl", "2xl"];

function heights(flat: Flat, system: DesignSystem, component: string, touch = false): { size: string; h: number }[] {
  const m = measure(system, flat);
  return SIZE_ORDER.flatMap((size) => {
    const found = m.get(`${component}|${size}|root`);
    const h = touch ? found?.touchHeight : found?.height;
    return h === undefined ? [] : [{ size, h }];
  });
}
const steps = (hs: { size: string; h: number }[]) => hs.map((x) => `${x.size} ${round(x.h)}px`).join(", ");

export function inYourSystem(id: string, system: DesignSystem): string | undefined {
  const flat = flattenTokens(system.tokens);
  switch (id) {
    case "targets-minimum": {
      const small = [...measure(system, flat).values()].filter((m) => isTarget(m) && m.height !== undefined && m.height < 24);
      return small.length === 0 ? "Everything clickable is at least 24px tall." : `Under 24px: ${list(small.slice(0, 4).map((m) => `${m.label} (${round(m.height!)}px)`))}${small.length > 4 ? ` and ${small.length - 4} more` : ""}.`;
    }
    case "targets-touch": {
      const desk = heights(flat, system, "button");
      const touch = heights(flat, system, "button", true);
      if (desk.length === 0) return undefined;
      const raised = JSON.stringify(desk) !== JSON.stringify(touch);
      return `Buttons are ${steps(desk)}${raised ? `; on touch screens ${steps(touch)}` : ", the same on touch screens"}.`;
    }
    case "sizes-scale":
    case "sizes-adding": {
      const b = heights(flat, system, "button");
      const i = heights(flat, system, "input");
      if (b.length === 0) return undefined;
      const shared = b.filter((x) => i.some((y) => y.size === x.size));
      const off = shared.filter((x) => i.find((y) => y.size === x.size)!.h !== x.h).map((x) => x.size);
      return `Buttons step ${steps(b)}.${i.length === 0 ? "" : off.length === 0 ? " Inputs match them size for size, so they line up in a row." : ` Inputs differ at ${list(off)}, so those won't line up beside a button.`}`;
    }
    case "type-scale-ratio": {
      const config = system.generators["type"]?.config as { ratio?: number; base?: number } | undefined;
      const sizes = [...flat.keys()].filter((k) => /^font\.size\.\d+$/.test(k)).sort((a, b) => Number(a.split(".")[2]) - Number(b.split(".")[2])).map((k) => px(value(flat, k)) ?? 0);
      const ratio = config?.ratio;
      return `${ratio === undefined ? "Your scale" : `Your scale grows ${ratio}× a step`}: ${sizes.map((n) => `${round(n)}`).join(", ")}px.${ratio !== undefined && ratio <= 1.2 ? " That's on the compact end, suited to dense product UI." : ratio !== undefined && ratio >= 1.333 ? " That's expressive, suited to marketing and editorial." : ""}`;
    }
    case "type-min-size": {
      const small = [...measure(system, flat).values()].filter((m) => m.text !== undefined && m.text < 12);
      const names = [...new Set(small.map((m) => componentName(m.component)))];
      return small.length === 0 ? "No component text is under 12px." : `Under 12px: ${list(names.slice(0, 4))}${names.length > 4 ? ` and ${names.length - 4} more` : ""} (as small as ${round(Math.min(...small.map((m) => m.text!)))}px).`;
    }
    case "type-input-16": {
      const d = px(value(flat, "input.font-size"));
      const t = px(value(flat, "input.font-size", TOUCH));
      return d === undefined ? undefined : `Input text is ${round(d)}px${t !== undefined && t !== d ? `, ${round(t)}px on touch screens` : " on every screen"}${(t ?? d) < 16 ? ", so iPhones zoom in on focus" : ""}.`;
    }
    case "type-line-height": {
      const body = value(flat, "font.leading.3");
      return typeof body === "number" ? `Body text (step 3) has a line height of ${round(body)}.` : undefined;
    }
    case "spacing-grid": {
      const space = [...flat.keys()].filter((k) => /^space\.\d+$/.test(k)).map((k) => ({ k, v: px(value(flat, k)) ?? 0 }));
      const off = space.filter((x) => x.v > 0 && Math.abs(x.v / 2 - Math.round(x.v / 2)) > 0.01);
      return `Your spacing scale: ${space.map((x) => round(x.v)).join(", ")}px.${off.length === 0 ? " All on the grid." : ` Off the grid: ${list(off.map((x) => x.k))}.`}`;
    }
    case "radius-consistent": {
      const r = ["sm", "md", "lg", "xl"].map((s) => px(value(flat, `radius.${s}`))).filter((n) => n !== undefined) as number[];
      const button = px(value(flat, "button.radius"));
      const input = px(value(flat, "input.radius"));
      return `Radius steps ${r.map(round).join(", ")}px.${button !== undefined && input !== undefined ? ` Buttons ${round(button)}px, inputs ${round(input)}px${button === input ? " (matching)" : ""}.` : ""}`;
    }
    case "states-focus-visible": {
      const w = px(value(flat, "focus.width"));
      const o = px(value(flat, "focus.offset"));
      return w === undefined ? undefined : `Your focus ring is ${round(w)}px wide, ${round(o ?? 0)}px from the edge.`;
    }
    case "motion-duration": {
      const d = ["fast", "base", "slow"].map((n) => [n, ms(value(flat, `motion.duration.${n}`))] as const).filter(([, v]) => v !== undefined);
      return d.length === 0 ? undefined : `Your durations: ${d.map(([n, v]) => `${n} ${v}ms`).join(", ")}.`;
    }
    case "contrast-text":
    case "contrast-ui": {
      const s = summarizeContrast(checkContrast(includedComponents(system), flat, undefined, { fixes: false }));
      return s.failing === 0 ? `All ${s.checked} pairs checked pass, in light and dark.` : `${s.failing} of ${s.checked} pairs fall short; Checks lists them with fixes.`;
    }
    case "color-palettes-earn-place":
    case "color-meanings-semantic": {
      const palettes = Object.entries(system.generators).filter(([, g]) => (g.config as { kind?: string }).kind === "colorScale").map(([n]) => n);
      const meanings = Object.entries(system.intents).map(([n, d]) => `${n} → ${d.scale.replace(/^color\./, "")}`);
      return `Palettes: ${list(palettes)}. Meanings: ${meanings.join(", ")}.`;
    }
    default:
      return undefined;
  }
}
