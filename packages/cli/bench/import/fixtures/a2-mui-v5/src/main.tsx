import { CssBaseline, ThemeProvider, useMediaQuery } from "@mui/material";
import { getTheme } from "./theme";

export function Root() {
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  return (
    <ThemeProvider theme={getTheme(dark ? "dark" : "light")}>
      <CssBaseline />
    </ThemeProvider>
  );
}
