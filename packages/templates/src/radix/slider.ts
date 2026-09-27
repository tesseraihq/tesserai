import { type Anatomy } from "@tesserai/core";
import { SLIDER_CONTROL, sliderParts } from "../base-ui/slider";
import { type StatePrefixes } from "../classes";
import { classString } from "../codegen";
import { RADIX_STATES } from "./states";

// Slider's classes, which every framework's shell prints from. The root is the control too (Radix
// has no separate control part), so it carries the layout Base UI puts on its Control. Radix marks
// no dragging state; the held thumb is :active.
export function sliderPieces(anatomy: Anatomy, states: StatePrefixes = RADIX_STATES) {
  const { root, track, range, thumb } = sliderParts(anatomy, states, { ...states, dragging: ["active:"] });
  return { slots: { slider: [...SLIDER_CONTROL.split(" "), ...root], "slider-track": track, "slider-range": ["absolute", ...range], "slider-thumb": thumb } };
}

export function renderSlider(anatomy: Anatomy): string {
  const { slots } = sliderPieces(anatomy);
  // The control's layout and the recipe's classes, as two strings.
  const control = slots.slider.slice(0, SLIDER_CONTROL.split(" ").length);
  const root = slots.slider.slice(control.length);
  return `import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// The label given to the slider is also given to each thumb, since the thumb is what gets focus.
function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const label = props["aria-label"];
  const labelledBy = props["aria-labelledby"];
  const values = React.useMemo(() => (Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min, max]), [value, defaultValue, min, max]);
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      {...(defaultValue === undefined ? {} : { defaultValue })}
      {...(value === undefined ? {} : { value })}
      min={min}
      max={max}
      className={cn(${classString(control)}, ${classString(root)}, className)}
      {...props}
    >
      <SliderPrimitive.Track data-slot="slider-track" className=${classString(slots["slider-track"])}>
        <SliderPrimitive.Range data-slot="slider-range" className=${classString(slots["slider-range"])} />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          key={index}
          data-slot="slider-thumb"
          className=${classString(slots["slider-thumb"])}
          {...(label === undefined ? {} : { "aria-label": label })}
          {...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy })}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
`;
}
