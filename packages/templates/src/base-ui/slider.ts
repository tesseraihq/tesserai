import { type Anatomy } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// Base UI's thumb is a div around a hidden range input: keyboard focus lands on the input, so the
// thumb shows it with :has(:focus-visible).
const THUMB_STATES: StatePrefixes = { ...BASE_UI_STATES, "focus-visible": ["has-[:focus-visible]:"] };

export const SLIDER_ROOT_BASE = ["data-[orientation=horizontal]:w-full", "data-[orientation=vertical]:h-full"];
export const SLIDER_CONTROL = "relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col";
export const SLIDER_TRACK_BASE = ["relative", "grow", "overflow-hidden", "select-none", "data-[orientation=horizontal]:w-full", "data-[orientation=vertical]:h-full"];
export const SLIDER_RANGE_BASE = ["select-none", "data-[orientation=horizontal]:h-full", "data-[orientation=vertical]:w-full"];
export const SLIDER_THUMB_BASE = ["block", "shrink-0", "select-none", "outline-none", "transition-[color,box-shadow]"];

export function sliderParts(anatomy: Anatomy, states: StatePrefixes, thumbStates: StatePrefixes) {
  return {
    root: flatClasses(anatomy, "root", { states }, SLIDER_ROOT_BASE),
    track: flatClasses(anatomy, "track", { states }, SLIDER_TRACK_BASE),
    range: flatClasses(anatomy, "range", { states }, SLIDER_RANGE_BASE),
    thumb: flatClasses(anatomy, "thumb", { states: thumbStates }, SLIDER_THUMB_BASE),
  };
}

// No value or a single number renders two thumbs from min to max, as shadcn's does; pass an array
// for one thumb ([50]) or several.
export function renderSlider(anatomy: Anatomy): string {
  const { root, track, range, thumb } = sliderParts(anatomy, BASE_UI_STATES, THUMB_STATES);
  return `import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

export type SliderProps = Omit<React.ComponentProps<typeof SliderPrimitive.Root>, "className"> & { className?: string };

// The label given to the slider is also given to each thumb, since the thumb is what gets focus.
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: SliderProps) {
  const label = props["aria-label"];
  const values = Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max];
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(${classString(root)}, className)}
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(value === undefined ? {} : { value })}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="${SLIDER_CONTROL}">
        <SliderPrimitive.Track data-slot="slider-track" className=${classString(track)}>
          <SliderPrimitive.Indicator data-slot="slider-range" className=${classString(range)} />
        </SliderPrimitive.Track>
        {Array.from({ length: values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            key={index}
            index={index}
            data-slot="slider-thumb"
            className=${classString(thumb)}
            {...(label === undefined ? {} : { getAriaLabel: () => label })}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
`;
}

