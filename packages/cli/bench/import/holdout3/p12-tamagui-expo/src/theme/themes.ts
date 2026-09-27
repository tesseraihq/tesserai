import { palette as p } from './palette'

export const light = {
  background: p.paper,
  backgroundHover: p.fog,
  backgroundPress: p.fog,
  backgroundStrong: p.white,
  color: p.ink,
  colorHover: p.ink,
  colorMuted: p.slate,
  borderColor: p.fog,
  placeholderColor: p.mist,
  accentBackground: p.ember,
  accentColor: p.emberInk,
  danger: p.rust,
  success: p.moss,
  warning: p.amber,
  shadowColor: 'rgba(21, 24, 28, 0.08)',
}

export const dark: typeof light = {
  background: p.night,
  backgroundHover: p.night3,
  backgroundPress: p.night3,
  backgroundStrong: p.night2,
  color: p.snow,
  colorHover: p.snow,
  colorMuted: p.mist,
  borderColor: p.night4,
  placeholderColor: p.slate,
  accentBackground: p.ember300,
  accentColor: p.night,
  danger: p.rust300,
  success: p.moss300,
  warning: p.amber300,
  shadowColor: 'rgba(0, 0, 0, 0.4)',
}
