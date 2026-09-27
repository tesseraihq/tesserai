import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: { DEFAULT: "#e11d48", foreground: "#ffffff", hover: "#be123c" },
        danger: "#b91c1c",
      },
      fontFamily: { sans: ['"DM Sans"', ...defaultTheme.fontFamily.sans] },
      borderRadius: { DEFAULT: "6px", lg: "10px" },
    },
  },
} satisfies Config;
