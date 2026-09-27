import type { DimensionValue } from "./tokens";

export const ROOT_FONT_PX = 16;

export function round(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function px(value: number): DimensionValue {
  return { value, unit: "px" };
}

export function rem(valuePx: number): DimensionValue {
  return { value: round(valuePx / ROOT_FONT_PX), unit: "rem" };
}

export function toPx(d: DimensionValue): number {
  return d.unit === "px" ? d.value : d.value * ROOT_FONT_PX;
}

export function snapTo(n: number, grid: number): number {
  return Math.round(n / grid) * grid;
}
