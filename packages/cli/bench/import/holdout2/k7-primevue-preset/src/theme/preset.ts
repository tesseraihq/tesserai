import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import { harbor, lagoon } from "./palette";

export const LagoonPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: "0",
      xs: "4px",
      sm: "6px",
      md: "10px",
      lg: "14px",
      xl: "20px",
    },
  },
  semantic: {
    primary: lagoon,
    colorScheme: {
      light: {
        surface: harbor,
        primary: {
          color: "{primary.600}",
          contrastColor: "#ffffff",
          hoverColor: "{primary.700}",
          activeColor: "{primary.800}",
        },
        highlight: {
          background: "{primary.50}",
          focusBackground: "{primary.100}",
          color: "{primary.700}",
          focusColor: "{primary.800}",
        },
        text: {
          color: "{surface.800}",
          hoverColor: "{surface.900}",
          mutedColor: "{surface.500}",
          hoverMutedColor: "{surface.600}",
        },
        content: {
          background: "{surface.0}",
          hoverBackground: "{surface.50}",
          borderColor: "{surface.200}",
          color: "{text.color}",
          hoverColor: "{text.hover.color}",
        },
      },
      dark: {
        surface: harbor,
        primary: {
          color: "{primary.300}",
          contrastColor: "{surface.950}",
          hoverColor: "{primary.200}",
          activeColor: "{primary.100}",
        },
        highlight: {
          background: "color-mix(in srgb, {primary.400}, transparent 84%)",
          focusBackground: "color-mix(in srgb, {primary.400}, transparent 76%)",
          color: "rgba(255,255,255,.87)",
          focusColor: "rgba(255,255,255,.87)",
        },
        text: {
          color: "{surface.50}",
          hoverColor: "{surface.0}",
          mutedColor: "{surface.400}",
          hoverMutedColor: "{surface.300}",
        },
        content: {
          background: "{surface.900}",
          hoverBackground: "{surface.800}",
          borderColor: "{surface.700}",
          color: "{text.color}",
          hoverColor: "{text.hover.color}",
        },
      },
    },
  },
});
