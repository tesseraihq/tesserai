// Tailwind v3 + daisyUI v4 config from before the v4 migration (PR #212).
// Kept for reference while the new theme settles.
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        harbor: {
          primary: "#1d4ed8",
          "primary-content": "#eff6ff",
          secondary: "#0d9488",
          accent: "#f59e0b",
          neutral: "#1e293b",
          "base-100": "#ffffff",
          "base-200": "#f1f5f9",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          success: "#16a34a",
          warning: "#f59e0b",
          error: "#dc2626",
          "--rounded-btn": "0.375rem",
          "--rounded-box": "0.5rem",
        },
      },
      "dark",
    ],
  },
};
