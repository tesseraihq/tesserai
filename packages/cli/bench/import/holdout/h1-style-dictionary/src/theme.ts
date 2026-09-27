const KEY = 'ledgerline:theme';

export type ThemeName = 'light' | 'dark';

export function applyStoredTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    // private mode
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light');
}

export function setTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // ignore
  }
}
