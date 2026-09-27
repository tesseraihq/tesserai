import { alpha, createTheme } from "@mui/material/styles";

const violet = { 300: "#c4b5fd", 500: "#7c3aed", 700: "#5b21b6" };

export function getTheme(mode: "light" | "dark") {
  const light = mode === "light";
  return createTheme({
    palette: {
      mode,
      primary: { main: light ? violet[700] : violet[300], contrastText: light ? "#ffffff" : "#1e1b4b" },
      error: { main: light ? "#b91c1c" : "#f87171" },
      background: { default: light ? "#f8fafc" : "#0b1120", paper: light ? "#ffffff" : "#111827" },
      text: { primary: light ? "#0f172a" : "#e2e8f0" },
      divider: light ? "#e2e8f0" : alpha("#e2e8f0", 0.12),
    },
    typography: { fontFamily: '"Nunito Sans", "Helvetica", "Arial", sans-serif', fontSize: 15 },
    shape: { borderRadius: 12 },
    spacing: 8,
  });
}
