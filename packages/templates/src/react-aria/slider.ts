import { type Anatomy } from "@tesserai/core";
import { SLIDER_CONTROL, sliderParts } from "../base-ui/slider";
import { classString } from "../codegen";
import { RAC_STATES } from "./states";

// React Aria positions each thumb with translate(-50%, -50%) along the track, so it is offset 50%
// across it; the root is the group those offsets read orientation from.
export function renderSlider(anatomy: Anatomy): string {
  const { root, track, range, thumb } = sliderParts(anatomy, RAC_STATES, RAC_STATES);
  const thumbClasses = [...thumb, "group-data-[orientation=horizontal]:top-[50%]", "group-data-[orientation=vertical]:left-[50%]"];
  return `import * as React from "react";
import { Slider as SliderPrimitive, SliderFill, SliderThumb, SliderTrack, type SliderProps as SliderPrimitiveProps } from "react-aria-components";
import { cn } from "@/lib/utils";

type SliderValue = number | number[];
export type SliderProps<T extends SliderValue = SliderValue> = Omit<SliderPrimitiveProps<T>, "className"> & { className?: string };

function Slider<T extends SliderValue = SliderValue>({ className, ...props }: SliderProps<T>) {
  return (
    <SliderPrimitive data-slot="slider" className={cn("group ${SLIDER_CONTROL}", ${classString(root)}, className)} {...props}>
      {({ state }) => (
        <>
          <SliderTrack data-slot="slider-track" className=${classString(track)}>
            <SliderFill data-slot="slider-range" className=${classString(["absolute", ...range])} />
          </SliderTrack>
          {state.values.map((_, index) => (
            <SliderThumb key={index} index={index} data-slot="slider-thumb" className=${classString(thumbClasses)} />
          ))}
        </>
      )}
    </SliderPrimitive>
  );
}

export { Slider };
`;
}
