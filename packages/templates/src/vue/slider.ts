import type { Anatomy } from "@tesserai/core";
import { sliderPieces } from "../radix/slider";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses } from "./sfc";

// Slider on Reka's parts; v-model is an array, one number per thumb. With no value, two thumbs
// span min to max, as in the React file (and shadcn's). The label given to the slider is also
// given to each thumb, since the thumb is what gets focus.
export function renderSlider(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = sliderPieces(anatomy);
  const f = folder("slider");
  const slider = f.file(
    "Slider",
    `import type { SliderRootEmits, SliderRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { computed, useAttrs } from "vue";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<SliderRootProps & { class?: HTMLAttributes["class"] }>(), { min: 0, max: 100 });
const emits = defineEmits<SliderRootEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const attrs = useAttrs();
const bound = computed(() => (props.modelValue === undefined && props.defaultValue === undefined ? { ...forwarded.value, defaultValue: [props.min, props.max] } : forwarded.value));
const thumb = computed(() => ({ "aria-label": attrs["aria-label"], "aria-labelledby": attrs["aria-labelledby"] }));`,
    `<SliderRoot v-slot="{ modelValue }" data-slot="slider" v-bind="bound" :class="cn(${classList(slots.slider)}, props.class)">
  <SliderTrack data-slot="slider-track" ${staticClasses(slots["slider-track"])}>
    <SliderRange data-slot="slider-range" ${staticClasses(slots["slider-range"])} />
  </SliderTrack>
  <SliderThumb v-for="(_, index) in modelValue" :key="index" data-slot="slider-thumb" v-bind="thumb" ${staticClasses(slots["slider-thumb"])} />
</SliderRoot>`,
  );
  return [slider, barrel("slider", ["Slider"])];
}
