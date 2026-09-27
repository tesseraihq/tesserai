// First theme attempt (Lara + indigo). Replaced by preset.ts in March; kept until
// the marketing site stops screenshotting the old look.
import { definePreset } from "@primeuix/themes";
import Lara from "@primeuix/themes/lara";

export const LaraIndigo = definePreset(Lara, {
  semantic: {
    primary: {
      50: "#eef2ff",
      100: "#e0e7ff",
      200: "#c7d2fe",
      300: "#a5b4fc",
      400: "#818cf8",
      500: "#6366f1",
      600: "#4f46e5",
      700: "#4338ca",
      800: "#3730a3",
      900: "#312e81",
      950: "#1e1b4b",
    },
    colorScheme: {
      light: {
        surface: { 0: "#ffffff", 50: "#fafafa", 100: "#f4f4f5", 900: "#18181b" },
      },
    },
  },
});
