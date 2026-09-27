import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { plum, sand } from "./colors";

const config = defineConfig({
  globalCss: {
    html: {
      // every component without an explicit colorPalette uses plum
      colorPalette: "plum",
    },
  },
  theme: {
    tokens: {
      colors: { plum, sand },
      fonts: {
        body: { value: "var(--font-inter), system-ui, sans-serif" },
        heading: { value: "var(--font-bricolage), system-ui, sans-serif" },
      },
      radii: {
        l2: { value: "0.375rem" },
      },
    },
    semanticTokens: {
      colors: {
        plum: {
          solid: { value: { _light: "{colors.plum.600}", _dark: "{colors.plum.300}" } },
          contrast: { value: { _light: "white", _dark: "{colors.plum.950}" } },
          fg: { value: { _light: "{colors.plum.700}", _dark: "{colors.plum.200}" } },
          muted: { value: { _light: "{colors.plum.100}", _dark: "{colors.plum.900}" } },
          subtle: { value: { _light: "{colors.plum.50}", _dark: "{colors.plum.950}" } },
          emphasized: { value: { _light: "{colors.plum.200}", _dark: "{colors.plum.800}" } },
          focusRing: { value: { _light: "{colors.plum.500}", _dark: "{colors.plum.400}" } },
        },
        bg: {
          DEFAULT: { value: { _light: "{colors.sand.50}", _dark: "{colors.sand.950}" } },
          panel: { value: { _light: "white", _dark: "{colors.sand.900}" } },
          subtle: { value: { _light: "{colors.sand.100}", _dark: "{colors.sand.900}" } },
          muted: { value: { _light: "{colors.sand.200}", _dark: "{colors.sand.800}" } },
        },
        fg: {
          DEFAULT: { value: { _light: "{colors.sand.900}", _dark: "{colors.sand.50}" } },
          muted: { value: { _light: "{colors.sand.600}", _dark: "{colors.sand.400}" } },
          subtle: { value: { _light: "{colors.sand.400}", _dark: "{colors.sand.500}" } },
        },
        border: {
          DEFAULT: { value: { _light: "{colors.sand.200}", _dark: "{colors.sand.800}" } },
          muted: { value: { _light: "{colors.sand.100}", _dark: "{colors.sand.900}" } },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
