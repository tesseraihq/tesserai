import { oklch } from "./color";
import { setToken } from "./tokens";
import { createSystemFromBrand, regenerate, type DesignSystem } from "./system";

export type Preset = {
  id: string;
  label: string;
  description: string;
  build: () => DesignSystem;
};

function withFont(system: DesignSystem, families: string[]): DesignSystem {
  setToken(system.tokens, "font.family.sans", { $type: "fontFamily", $value: families });
  return system;
}

function configure(
  system: DesignSystem,
  edits: { radius?: number; spacing?: number; typeBase?: number; typeRatio?: number },
): DesignSystem {
  const radius = system.generators["radius"]?.config;
  if (radius?.kind === "radiusScale" && edits.radius !== undefined) radius.base = edits.radius;
  const space = system.generators["space"]?.config;
  if (space?.kind === "spacing" && edits.spacing !== undefined) space.base = edits.spacing;
  const type = system.generators["type"]?.config;
  if (type?.kind === "typeScale") {
    if (edits.typeBase !== undefined) type.base = edits.typeBase;
    if (edits.typeRatio !== undefined) type.ratio = edits.typeRatio;
  }
  regenerate(system);
  return system;
}

// What a new system is called until it's named: never the preset's name, which reads like the
// component library it's built on ("shadcn") rather than a system of your own.
export const NEW_SYSTEM_NAME = "My design system";

export const PRESETS: Preset[] = [
  {
    id: "shadcn",
    label: "shadcn",
    description: "Near-black primary on zinc neutrals, the stock shadcn look.",
    build: () =>
      configure(withFont(createSystemFromBrand(NEW_SYSTEM_NAME, oklch(0.21, 0.006, 285)), ["Geist", "ui-sans-serif", "system-ui", "sans-serif"]), {
        radius: 5,
        spacing: 4,
        typeBase: 14,
        typeRatio: 1.2,
      }),
  },
  {
    id: "material",
    label: "Material",
    description: "Material 3 baseline purple, larger radii, Roboto.",
    build: () =>
      configure(withFont(createSystemFromBrand(NEW_SYSTEM_NAME, oklch(0.49, 0.17, 296)), ["Roboto", "ui-sans-serif", "system-ui", "sans-serif"]), {
        radius: 8,
        spacing: 4,
        typeBase: 16,
        typeRatio: 1.25,
      }),
  },
  {
    id: "enterprise",
    label: "Enterprise",
    description: "Compact, square, steel blue, system font. For dense data products.",
    build: () =>
      configure(
        withFont(createSystemFromBrand(NEW_SYSTEM_NAME, oklch(0.45, 0.11, 250)), ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"]),
        { radius: 2, spacing: 4, typeBase: 13, typeRatio: 1.125 },
      ),
  },
];

export function presetById(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
