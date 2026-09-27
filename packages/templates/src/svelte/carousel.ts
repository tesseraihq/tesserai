import type { Anatomy } from "@tesserai/core";
import { carouselPieces, type Oriented } from "../carousel";
import type { GeneratedFile } from "../render";
import { indexFile, indexParts, lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// Carousel on embla-carousel-svelte, laid out as shadcn-svelte's: the carousel's state is a context
// (context.ts) its parts read, Embla runs as an action on the content, and the arrows are the
// system's Button. It behaves as the React file does: the arrow keys scroll it, and each arrow is
// disabled at its end.

// The three class constants of an element placed by the carousel's orientation.
const orientedConstants = (o: Oriented) => `const classes = ${quoted(o.base)};
const horizontal = ${quoted(o.horizontal)};
const vertical = ${quoted(o.vertical)};`;
const ORIENTED_CLASS = `cn(classes, ctx.orientation === "horizontal" ? horizontal : vertical, className)`;

export function carouselFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, oriented } = carouselPieces(anatomy);
  const context: GeneratedFile = {
    path: "carousel/context.ts",
    source: `import { getContext, hasContext, setContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { EmblaCarouselSvelteType, default as emblaCarouselSvelte } from "embla-carousel-svelte";
import type { WithElementRef } from "$UTILS$.js";

export type CarouselAPI =
  NonNullable<NonNullable<EmblaCarouselSvelteType["$$_attributes"]>["on:emblaInit"]> extends (evt: CustomEvent<infer CarouselAPI>) => void ? CarouselAPI : never;

type EmblaCarouselConfig = NonNullable<Parameters<typeof emblaCarouselSvelte>[1]>;

export type CarouselOptions = EmblaCarouselConfig["options"];
export type CarouselPlugins = EmblaCarouselConfig["plugins"];

export type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugins;
  setApi?: (api: CarouselAPI | undefined) => void;
  orientation?: "horizontal" | "vertical";
} & WithElementRef<HTMLAttributes<HTMLDivElement>>;

const EMBLA_CAROUSEL_CONTEXT = Symbol("EMBLA_CAROUSEL_CONTEXT");

export type EmblaContext = {
  api: CarouselAPI | undefined;
  orientation: "horizontal" | "vertical";
  scrollNext: () => void;
  scrollPrev: () => void;
  canScrollNext: boolean;
  canScrollPrev: boolean;
  handleKeyDown: (e: KeyboardEvent) => void;
  options: CarouselOptions;
  plugins: CarouselPlugins;
  onInit: (e: CustomEvent<CarouselAPI>) => void;
  scrollTo: (index: number, jump?: boolean) => void;
  scrollSnaps: number[];
  selectedIndex: number;
};

export function setEmblaContext(config: EmblaContext): EmblaContext {
  setContext(EMBLA_CAROUSEL_CONTEXT, config);
  return config;
}

export function getEmblaContext(name = "This component") {
  if (!hasContext(EMBLA_CAROUSEL_CONTEXT)) throw new Error(\`\${name} must be used within a <Carousel.Root> component\`);
  return getContext<ReturnType<typeof setEmblaContext>>(EMBLA_CAROUSEL_CONTEXT);
}
`,
  };
  const root = svelteFile("carousel/carousel.svelte", {
    script: `${UTILS_IMPORT(["cn"])}
import { type CarouselAPI, type CarouselProps, type EmblaContext, setEmblaContext } from "./context.js";

const classes = ${quoted(slots.carousel)};

let {
  ref = $bindable(null),
  opts = {},
  plugins = [],
  setApi = () => {},
  orientation = "horizontal",
  class: className,
  children,
  ...restProps
}: CarouselProps = $props();

// svelte-ignore state_referenced_locally
let carouselState = $state<EmblaContext>({
  api: undefined,
  scrollPrev,
  scrollNext,
  orientation,
  canScrollNext: false,
  canScrollPrev: false,
  handleKeyDown,
  options: opts,
  plugins,
  onInit,
  scrollSnaps: [],
  selectedIndex: 0,
  scrollTo,
});

setEmblaContext(carouselState);

function scrollPrev() {
  carouselState.api?.scrollPrev();
}

function scrollNext() {
  carouselState.api?.scrollNext();
}

function scrollTo(index: number, jump?: boolean) {
  carouselState.api?.scrollTo(index, jump);
}

function onSelect() {
  if (!carouselState.api) return;
  carouselState.selectedIndex = carouselState.api.selectedScrollSnap();
  carouselState.canScrollNext = carouselState.api.canScrollNext();
  carouselState.canScrollPrev = carouselState.api.canScrollPrev();
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    scrollPrev();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    scrollNext();
  }
}

function onInit(event: CustomEvent<CarouselAPI>) {
  carouselState.api = event.detail;
  setApi(carouselState.api);
  carouselState.scrollSnaps = carouselState.api.scrollSnapList();
  carouselState.api.on("reInit", onSelect);
  carouselState.api.on("select", onSelect);
  onSelect();
}

$effect(() => {
  return () => {
    carouselState.api?.off("select", onSelect);
  };
});`,
    markup: `<div bind:this={ref} onkeydowncapture={handleKeyDown} class={cn(classes, className)} role="region" aria-roledescription="carousel" data-slot="carousel" {...restProps}>
  {@render children?.()}
</div>`,
  });
  // The page's attributes and classes go on the track Embla moves, inside the clipping frame.
  const content = svelteFile("carousel/carousel-content.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
import emblaCarouselSvelte from "embla-carousel-svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getEmblaContext } from "./context.js";

const frameClasses = ${quoted(slots["carousel-content"])};
${orientedConstants(oriented["carousel-content:track"])}

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const ctx = getEmblaContext("<Carousel.Content/>");`,
    markup: `<div
  data-slot="carousel-content"
  class={frameClasses}
  use:emblaCarouselSvelte={{
    options: { container: "[data-embla-container]", slides: "[data-embla-slide]", ...ctx.options, axis: ctx.orientation === "horizontal" ? "x" : "y" },
    plugins: ctx.plugins,
  }}
  onemblaInit={ctx.onInit}
>
  <div bind:this={ref} class={${ORIENTED_CLASS}} data-embla-container="" {...restProps}>
    {@render children?.()}
  </div>
</div>`,
  });
  const item = svelteFile("carousel/carousel-item.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getEmblaContext } from "./context.js";

${orientedConstants(oriented["carousel-item"])}

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const ctx = getEmblaContext("<Carousel.Item/>");`,
    markup: `<div bind:this={ref} data-slot="carousel-item" role="group" aria-roledescription="slide" class={${ORIENTED_CLASS}} data-embla-slide="" {...restProps}>
  {@render children?.()}
</div>`,
  });
  const arrow = (name: "Previous" | "Next") => {
    const [fn, can, icon] = name === "Previous" ? ["scrollPrev", "canScrollPrev", "ChevronLeftIcon"] : ["scrollNext", "canScrollNext", "ChevronRightIcon"];
    const slot = `carousel-${name.toLowerCase()}` as "carousel-previous" | "carousel-next";
    return svelteFile(`carousel/${slot}.svelte`, {
      script: `${lucideImport(icon)}
${uiImport("button", ["Button", "type ButtonProps"])}
${UTILS_IMPORT(["cn", "type WithoutChildren"])}
import { getEmblaContext } from "./context.js";

${orientedConstants(oriented[slot])}
const iconClasses = "rtl:rotate-180";
const labelClasses = "sr-only";

let { ref = $bindable(null), class: className, variant = "outline", size = "icon-sm", ...restProps }: WithoutChildren<ButtonProps> = $props();

const ctx = getEmblaContext("<Carousel.${name}/>");`,
      markup: `<Button
  bind:ref
  data-slot="${slot}"
  {variant}
  {size}
  class={${ORIENTED_CLASS}}
  disabled={!ctx.${can}}
  onclick={ctx.${fn}}
  {...restProps}
>
  <${icon} class={iconClasses} />
  <span class={labelClasses}>${name} slide</span>
</Button>`,
    });
  };
  return [
    context,
    root,
    content,
    item,
    arrow("Previous"),
    arrow("Next"),
    indexFile(
      "carousel/index.ts",
      indexParts([
        ["carousel.svelte", "Root", "Carousel"],
        ["carousel-content.svelte", "Content", "CarouselContent"],
        ["carousel-item.svelte", "Item", "CarouselItem"],
        ["carousel-previous.svelte", "Previous", "CarouselPrevious"],
        ["carousel-next.svelte", "Next", "CarouselNext"],
      ]),
      [{ file: "context.js", names: ["getEmblaContext as useCarousel", "type CarouselAPI", "type CarouselAPI as CarouselApi"] }],
    ),
  ];
}
