import defaultTheme from "tailwindcss/defaultTheme";
import typography from "@tailwindcss/typography";
import daisyui from "daisyui";
import themes from "daisyui/src/theming/themes";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Karla", ...defaultTheme.fontFamily.sans],
        display: ["Space Grotesk", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [typography, daisyui],
  daisyui: {
    themes: [
      {
        fieldnote: {
          ...themes["light"],
          primary: "#0f766e",
          "primary-content": "#f0fdfa",
          "base-100": "#fcfcf9",
          "base-200": "#f3f2ec",
          "base-content": "#1c2321",
          error: "#b42318",
          "--rounded-btn": "0.375rem",
        },
      },
      {
        "fieldnote-dark": {
          ...themes["dark"],
          primary: "#2dd4bf",
          "primary-content": "#042f2e",
          "base-100": "#101614",
          "base-content": "#d5dedb",
          "--rounded-btn": "0.375rem",
        },
      },
      // kept for the Storybook theme switcher
      "cupcake",
    ],
    darkTheme: "fieldnote-dark",
    logs: false,
  },
};
