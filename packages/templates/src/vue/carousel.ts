import type { Anatomy } from "@tesserai/core";
import { carouselPieces, type Oriented } from "../carousel";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses } from "./sfc";

// Carousel on embla-carousel-vue, laid out as shadcn-vue's: the carousel's state is provided to its
// parts (useCarousel), its types are in interface.ts, and the arrows are the system's Button. It
// behaves as the React file does: the arrow keys scroll it, and each arrow is disabled at its end.

// A cn argument list for an element placed by the carousel's orientation.
const byOrientation = (o: Oriented) => `${classList(o.base)}, orientation === 'horizontal' ? ${classList(o.horizontal)} : ${classList(o.vertical)}`;

export function renderCarousel(anatomy: Anatomy): GeneratedFile[] {
  const { slots, oriented } = carouselPieces(anatomy);
  const f = folder("carousel");
  const types: GeneratedFile = {
    path: "carousel/interface.ts",
    source: `import type useEmblaCarousel from "embla-carousel-vue";
import type { EmblaCarouselVueType } from "embla-carousel-vue";
import type { HTMLAttributes, UnwrapRef } from "vue";

type CarouselApi = EmblaCarouselVueType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

export type UnwrapRefCarouselApi = UnwrapRef<CarouselApi>;

export interface CarouselProps {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
}

export interface CarouselEmits {
  (e: "init-api", payload: UnwrapRefCarouselApi): void;
}

export interface WithClassAsProps {
  class?: HTMLAttributes["class"];
}
`,
  };
  const state: GeneratedFile = {
    path: "carousel/useCarousel.ts",
    source: `import type { UnwrapRefCarouselApi as CarouselApi, CarouselEmits, CarouselProps } from "./interface";
import { createInjectionState } from "@vueuse/core";
import emblaCarouselVue from "embla-carousel-vue";
import { ref, watch } from "vue";

const [useProvideCarousel, useInjectCarousel] = createInjectionState(({ opts, orientation, plugins }: CarouselProps, emits: CarouselEmits) => {
  const [emblaNode, emblaApi] = emblaCarouselVue({ ...opts, axis: orientation === "horizontal" ? "x" : "y" }, plugins);

  const canScrollPrev = ref(false);
  const canScrollNext = ref(false);
  function onSelect(api: CarouselApi) {
    canScrollPrev.value = api?.canScrollPrev() ?? false;
    canScrollNext.value = api?.canScrollNext() ?? false;
  }
  const scrollPrev = () => emblaApi.value?.scrollPrev();
  const scrollNext = () => emblaApi.value?.scrollNext();

  // Embla starts once the content is mounted.
  watch(emblaApi, (api) => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    emits("init-api", api);
  });

  return { carouselRef: emblaNode, carouselApi: emblaApi, canScrollPrev, canScrollNext, scrollPrev, scrollNext, orientation };
});

function useCarousel() {
  const state = useInjectCarousel();
  if (!state) throw new Error("useCarousel must be used within a <Carousel />");
  return state;
}

export { useCarousel, useProvideCarousel };
`,
  };
  const carousel = f.file(
    "Carousel",
    `import type { CarouselEmits, CarouselProps, WithClassAsProps } from "./interface";
import { cn } from "@/lib/utils";
import { useProvideCarousel } from "./useCarousel";

const props = withDefaults(defineProps<CarouselProps & WithClassAsProps>(), { orientation: "horizontal" });
const emits = defineEmits<CarouselEmits>();

const { canScrollNext, canScrollPrev, carouselApi, carouselRef, orientation, scrollNext, scrollPrev } = useProvideCarousel(props, emits);

defineExpose({ canScrollNext, canScrollPrev, carouselApi, carouselRef, orientation, scrollNext, scrollPrev });

function onKeyDown(event: KeyboardEvent) {
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    scrollPrev();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    scrollNext();
  }
}`,
    `<div :class="cn(${classList(slots.carousel)}, props.class)" role="region" aria-roledescription="carousel" data-slot="carousel" @keydown.capture="onKeyDown">
  <slot :can-scroll-next :can-scroll-prev :carousel-api :carousel-ref :orientation :scroll-next :scroll-prev />
</div>`,
  );
  // The page's attributes and classes go on the track Embla moves, inside the clipping frame.
  const content = f.file(
    "CarouselContent",
    `import type { WithClassAsProps } from "./interface";
import { cn } from "@/lib/utils";
import { useCarousel } from "./useCarousel";

defineOptions({ inheritAttrs: false });

const props = defineProps<WithClassAsProps>();
const { carouselRef, orientation } = useCarousel();
// Embla measures and moves the frame's track.
function setFrame(el: unknown) {
  carouselRef.value = el instanceof HTMLElement ? el : undefined;
}`,
    `<div :ref="setFrame" ${staticClasses(slots["carousel-content"])} data-slot="carousel-content">
  <div :class="cn(${byOrientation(oriented["carousel-content:track"])}, props.class)" v-bind="$attrs">
    <slot />
  </div>
</div>`,
  );
  const item = f.file(
    "CarouselItem",
    `import type { WithClassAsProps } from "./interface";
import { cn } from "@/lib/utils";
import { useCarousel } from "./useCarousel";

const props = defineProps<WithClassAsProps>();
const { orientation } = useCarousel();`,
    `<div role="group" aria-roledescription="slide" data-slot="carousel-item" :class="cn(${byOrientation(oriented["carousel-item"])}, props.class)">
  <slot />
</div>`,
  );
  const arrow = (name: "Previous" | "Next") => {
    const [fn, can, icon] = name === "Previous" ? ["scrollPrev", "canScrollPrev", "ChevronLeftIcon"] : ["scrollNext", "canScrollNext", "ChevronRightIcon"];
    return f.file(
      `Carousel${name}`,
      `import type { WithClassAsProps } from "./interface";
import type { ButtonVariantProps } from "@/components/ui/button";
import { ${icon} } from "${LUCIDE_PACKAGES.vue}";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCarousel } from "./useCarousel";

const props = withDefaults(defineProps<{ variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"] } & WithClassAsProps>(), { variant: "outline", size: "icon-sm" });
const { orientation, ${can}, ${fn} } = useCarousel();`,
      `<Button
  data-slot="carousel-${name.toLowerCase()}"
  :variant="variant"
  :size="size"
  :class="cn(${byOrientation(oriented[`carousel-${name.toLowerCase()}` as "carousel-previous" | "carousel-next"])}, props.class)"
  :disabled="!${can}"
  @click="${fn}"
>
  <slot>
    <${icon} class="rtl:rotate-180" />
    <span class="sr-only">${name} slide</span>
  </slot>
</Button>`,
    );
  };
  return [
    types,
    state,
    carousel,
    content,
    item,
    arrow("Next"),
    arrow("Previous"),
    barrel(
      "carousel",
      ["Carousel", "CarouselContent", "CarouselItem", "CarouselNext", "CarouselPrevious"],
      `export type { UnwrapRefCarouselApi as CarouselApi } from "./interface";
export { useCarousel } from "./useCarousel";`,
    ),
  ];
}
