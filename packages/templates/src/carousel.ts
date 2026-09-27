import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// Classes that depend on which way a carousel runs: always, across, and down.
export type Oriented = { base: string[]; horizontal: string[]; vertical: string[] };

// Carousel's classes, which every framework's shell prints from. The track, the slides and the
// arrows are placed by the carousel's orientation; `slots` has every class an element can take.
export function carouselPieces(anatomy: Anatomy) {
  const control = flatClasses(anatomy, "control", { states: NATIVE_STATES });
  const oriented = {
    // The track inside carousel-content, which Embla moves; it has no data-slot of its own.
    "carousel-content:track": { base: ["flex"], horizontal: ["-ms-(--carousel-gap)"], vertical: ["-mt-(--carousel-gap)", "flex-col"] },
    "carousel-item": { base: ["min-w-0", "shrink-0", "grow-0", "basis-full"], horizontal: ["ps-(--carousel-gap)"], vertical: ["pt-(--carousel-gap)"] },
    "carousel-previous": { base: ["absolute", "touch-manipulation", ...control], horizontal: ["inset-y-0", "-start-12", "my-auto"], vertical: ["-top-12", "left-1/2", "-translate-x-1/2", "rotate-90"] },
    "carousel-next": { base: ["absolute", "touch-manipulation", ...control], horizontal: ["inset-y-0", "-end-12", "my-auto"], vertical: ["-bottom-12", "left-1/2", "-translate-x-1/2", "rotate-90"] },
  } satisfies Record<string, Oriented>;
  const all = (o: Oriented) => [...o.base, ...o.horizontal, ...o.vertical];
  return {
    slots: {
      carousel: ["relative"],
      "carousel-content": ["overflow-hidden"],
      "carousel-content:track": all(oriented["carousel-content:track"]),
      "carousel-item": all(oriented["carousel-item"]),
      "carousel-previous": all(oriented["carousel-previous"]),
      "carousel-next": all(oriented["carousel-next"]),
    },
    oriented,
  };
}

// Carousel on Embla as in shadcn; the arrows are the system's Button. React Aria's button takes
// isDisabled / onPress.
export function carouselTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const { slots, oriented } = carouselPieces(anatomy);
    const control = oriented["carousel-previous"].base.slice(2).join(" ");
    const one = (classes: string[]) => classes.join(" ");
    const aria = base === "react-aria";
    const press = (fn: string, can: string) => (aria ? `isDisabled={!${can}}\n      onPress={${fn}}` : `disabled={!${can}}\n      onClick={${fn}}`);
    const arrow = (name: string, fn: string, can: string, icon: string, label: string, placement: Oriented) => `function ${name}({ className, variant = "outline", size = "icon-sm", ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, ${fn}, ${can} } = useCarousel();
  return (
    <Button
      data-slot="${name === "CarouselPrevious" ? "carousel-previous" : "carousel-next"}"
      variant={variant}
      size={size}
      className={cn("absolute touch-manipulation ${control}", orientation === "horizontal" ? "${one(placement.horizontal)}" : "${one(placement.vertical)}", className)}
      ${press(fn, can)}
      {...props}
    >
      <${icon} className="rtl:rotate-180" />
      <span className="sr-only">${label}</span>
    </Button>
  );
}`;
    // A cn argument list for an oriented element, as the React file writes it.
    const byOrientation = (o: Oriented) => `${classString(o.base)}, orientation === "horizontal" ? ${classString(o.horizontal)} : ${classString(o.vertical)}`;
    const track = byOrientation(oriented["carousel-content:track"]);
    const item = byOrientation(oriented["carousel-item"]);
    return `import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) throw new Error("useCarousel must be used within a <Carousel />");
  return context;
}

function Carousel({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y" }, plugins);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);
  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api]);
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api]);
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (api && setApi) setApi(api);
  }, [api, setApi]);
  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}>
      <div onKeyDownCapture={handleKeyDown} className={cn(${classString(slots.carousel)}, className)} role="region" aria-roledescription="carousel" data-slot="carousel" {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel();
  return (
    <div ref={carouselRef} className=${classString(slots["carousel-content"])} data-slot="carousel-content">
      <div className={cn(${track}, className)} {...props} />
    </div>
  );
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel();
  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(${item}, className)}
      {...props}
    />
  );
}

${arrow("CarouselPrevious", "scrollPrev", "canScrollPrev", "ChevronLeftIcon", "Previous slide", oriented["carousel-previous"])}

${arrow("CarouselNext", "scrollNext", "canScrollNext", "ChevronRightIcon", "Next slide", oriented["carousel-next"])}

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel };
`;
  };
}
