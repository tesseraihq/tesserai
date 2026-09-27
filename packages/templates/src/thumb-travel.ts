import { cssVarName, isTokenRef, refPath, resolveRecipe, type Anatomy } from "@tesserai/core";
import type { CvaConfig } from "./factor";

const cssVar = (ref: string | undefined, fallback: string) => (ref !== undefined && isTokenRef(ref) ? `var(${cssVarName(refPath(ref))})` : fallback);

// How far a switch thumb travels when on, per size: the track's width minus the thumb, and the
// inset and border on both sides. It is read from whatever the recipe resolves to for each size, so a new
// size, or a width set by hand, moves the thumb correctly without template changes.
export function addThumbTravel(anatomy: Anatomy, thumb: CvaConfig, onPrefix: string): void {
  for (const size of anatomy.axes.size?.enabled ?? []) {
    const recipe = resolveRecipe(anatomy, { size });
    const width = cssVar(recipe["root"]?.base.width, "2.25rem");
    const thumbSize = cssVar(recipe["thumb"]?.base.size, "1rem");
    const inset = cssVar(recipe["root"]?.base.paddingX, "0px");
    const border = recipe["root"]?.base.borderWidth === undefined ? "0px" : cssVar(recipe["root"]?.base.borderWidth, "0px");
    const distance = `calc(${width}-${thumbSize}-2*${inset}-2*${border})`;
    thumb.variants.size ??= {};
    thumb.variants.size[size] = [...(thumb.variants.size[size] ?? []), `${onPrefix}translate-x-[${distance}]`, `rtl:${onPrefix}-translate-x-[${distance}]`];
  }
}
