import { createAnimations } from '@tamagui/animations-react-native'
import { shorthands } from '@tamagui/shorthands'
import { createFont, createTamagui, createTokens } from 'tamagui'
import { palette } from './src/theme/palette'
import { dark, light } from './src/theme/themes'

const bodyFont = createFont({
  family: 'Inter',
  size: { 1: 12, 2: 13, 3: 14, 4: 15, true: 15, 5: 17, 6: 20, 7: 24, 8: 30 },
  lineHeight: { 1: 16, 2: 18, 3: 20, 4: 22, true: 22, 5: 24, 6: 28, 7: 32, 8: 38 },
  weight: { 4: '400', 6: '600' },
  letterSpacing: { 4: 0 },
  face: {
    400: { normal: 'Inter' },
    600: { normal: 'InterSemiBold' },
  },
})

const headingFont = createFont({
  family: 'Fraunces',
  size: { 4: 18, true: 18, 5: 22, 6: 26, 7: 32, 8: 40 },
  lineHeight: { 4: 24, true: 24, 5: 28, 6: 32, 7: 38, 8: 46 },
  weight: { 6: '600' },
  face: { 600: { normal: 'Fraunces' } },
})

const tokens = createTokens({
  color: palette,
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 16, '-1': -4, '-2': -8 },
  size: { 0: 0, 1: 20, 2: 28, 3: 36, 4: 44, 5: 52, 6: 64, true: 44 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, true: 8 },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 },
})

const animations = createAnimations({
  quick: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  bouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
})

export const config = createTamagui({
  animations,
  defaultFont: 'body',
  shouldAddPrefersColorThemes: true,
  themeClassNameOnRoot: true,
  shorthands,
  fonts: { body: bodyFont, heading: headingFont },
  tokens,
  themes: { light, dark },
})

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
