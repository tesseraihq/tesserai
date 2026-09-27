import { Button, Card, createTheme, rem, type CSSVariablesResolver } from '@mantine/core';
import { ink, ocean } from './colors';

type ExtendedCustomColors = 'ocean' | 'ink';

declare module '@mantine/core' {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, import('@mantine/core').MantineColorsTuple>;
  }
}

export const theme = createTheme({
  primaryColor: 'ocean',
  primaryShade: { light: 7, dark: 5 },
  colors: { ocean, ink },

  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
  headings: {
    fontFamily: 'Outfit, Inter, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem(30), lineHeight: '1.2' },
      h2: { fontSize: rem(24), lineHeight: '1.25' },
      h3: { fontSize: rem(19), lineHeight: '1.3' },
    },
  },

  fontSizes: {
    xs: rem(12),
    sm: rem(13),
    md: rem(15),
    lg: rem(17),
    xl: rem(20),
  },

  defaultRadius: 'md',
  radius: {
    xs: rem(2),
    sm: rem(4),
    md: rem(6),
    lg: rem(10),
    xl: rem(16),
  },

  components: {
    Button: Button.extend({
      defaultProps: { size: 'sm' },
    }),
    Card: Card.extend({
      defaultProps: { padding: 'lg' },
      styles: {
        root: {
          backgroundColor: 'var(--app-card)',
          border: '1px solid var(--app-border)',
        },
      },
    }),
  },
});

// Surfaces and text. Mantine's own light/dark defaults are overridden so light mode
// sits on the ink ramp and dark mode matches the marketing site's GitHub-ish darks.
export const resolver: CSSVariablesResolver = (t) => ({
  variables: {},
  light: {
    '--mantine-color-body': t.colors.ink[0],
    '--mantine-color-text': t.colors.ink[9],
    '--mantine-color-dimmed': t.colors.ink[6],
    '--mantine-color-default-border': t.colors.ink[2],
    '--app-card': '#ffffff',
    '--app-border': t.colors.ink[2],
  },
  dark: {
    '--mantine-color-body': '#0e1117',
    '--mantine-color-text': t.colors.ink[1],
    '--mantine-color-dimmed': t.colors.ink[4],
    '--mantine-color-default-border': '#262c36',
    '--app-card': '#161b22',
    '--app-border': '#262c36',
  },
});
