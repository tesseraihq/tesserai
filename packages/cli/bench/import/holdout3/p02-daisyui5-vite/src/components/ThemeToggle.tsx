import { useEffect, useState } from "react";

const THEMES = { light: "harbor", dark: "harbor-night" } as const;

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("hd-theme");
    return saved === "light" || saved === "dark" ? saved : null;
  });

  useEffect(() => {
    if (mode === null) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.removeItem("hd-theme");
    } else {
      document.documentElement.setAttribute("data-theme", THEMES[mode]);
      localStorage.setItem("hd-theme", mode);
    }
  }, [mode]);

  return (
    <select
      className="select select-sm w-32"
      value={mode ?? "system"}
      onChange={(e) => setMode(e.target.value === "system" ? null : (e.target.value as "light" | "dark"))}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Night</option>
    </select>
  );
}
