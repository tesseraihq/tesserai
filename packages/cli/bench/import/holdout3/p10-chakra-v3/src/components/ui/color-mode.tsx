"use client";

import { IconButton } from "@chakra-ui/react";
import { ThemeProvider, useTheme, type ThemeProviderProps } from "next-themes";
import { LuMoon, LuSun } from "react-icons/lu";

export interface ColorModeProviderProps extends ThemeProviderProps {}

export function ColorModeProvider(props: ColorModeProviderProps) {
  return <ThemeProvider attribute="class" disableTransitionOnChange {...props} />;
}

export function ColorModeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <IconButton variant="ghost" aria-label="Toggle color mode" onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <LuMoon /> : <LuSun />}
    </IconButton>
  );
}
