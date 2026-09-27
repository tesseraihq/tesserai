import { cssVarName, type Anatomy } from "@tesserai/core";
import { mapStates } from "../classes";
import { classString } from "../codegen";
import { flatClasses } from "../factor";

// The mechanics of Base UI's drawer (swipe, snap points, stacked nested drawers) as shadcn wires
// them: they are behaviour, driven by the variables Base UI sets while swiping.
const POPUP_MECHANICS = [
  "group/drawer-popup pointer-events-auto fixed z-50 m-(--drawer-inset,0px) flex h-(--drawer-content-height) max-h-(--drawer-content-max-height,none) min-h-0 w-(--drawer-content-width,auto) transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))] flex-col transition-[transform,height,opacity,filter] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform outline-none select-none [interpolate-size:allow-keywords]",
  "data-nested-drawer-open:overflow-hidden data-nested-drawer-open:brightness-95",
  "[--drawer-content-height:var(--drawer-height,auto)] data-[swipe-axis=x]:[--drawer-content-width:75%] data-[swipe-axis=y]:[--drawer-content-max-height:calc(100dvh-6rem)] data-[swipe-axis=y]:data-snap-points:[--drawer-content-height:100dvh] data-[swipe-axis=x]:sm:[--drawer-content-width:24rem]",
  "[--bleed:3rem] [--peek:1rem] [--stack-height:var(--drawer-frontmost-height,var(--drawer-height,0px))] [--stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--stack-progress))*var(--peek)))] [--stack-progress:clamp(0,var(--drawer-swipe-progress),1)] [--stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--stack-step))))] [--stack-scale:clamp(0,calc(var(--stack-scale-base)+(var(--stack-step)*var(--stack-progress))),1)] [--stack-shrink:calc(1-var(--stack-scale))] [--stack-step:0.05]",
  "data-ending-style:transform-(--closed-transform) data-ending-style:opacity-[0.9999] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-nested-drawer-swiping:duration-0 data-starting-style:transform-(--closed-transform) data-swiping:duration-0",
  "data-[swipe-axis=y]:inset-x-0 data-[swipe-axis=y]:data-nested-drawer-open:h-(--stack-height) data-[swipe-axis=x]:inset-y-0 data-[swipe-axis=x]:flex-row",
  "data-[swipe-direction=down]:bottom-0 data-[swipe-direction=down]:origin-bottom data-[swipe-direction=down]:[--closed-transform:translate3d(0,calc(100%+var(--drawer-inset,0px)+2px),0)] data-[swipe-direction=down]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--stack-peek-offset)-(var(--stack-shrink)*var(--stack-height)))]",
  "data-[swipe-direction=up]:top-0 data-[swipe-direction=up]:origin-top data-[swipe-direction=up]:[--closed-transform:translate3d(0,calc(-100%-var(--drawer-inset,0px)-2px),0)] data-[swipe-direction=up]:[--translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)+var(--stack-peek-offset)+(var(--stack-shrink)*var(--stack-height)))]",
  "data-[swipe-direction=left]:left-0 data-[swipe-direction=left]:origin-left data-[swipe-direction=left]:[--closed-transform:translate3d(calc(-100%-var(--drawer-inset,0px)-2px),0,0)] data-[swipe-direction=left]:[--translate-x:calc(var(--drawer-swipe-movement-x)+var(--stack-peek-offset)+(var(--stack-shrink)*100%))]",
  "data-[swipe-direction=right]:right-0 data-[swipe-direction=right]:origin-right data-[swipe-direction=right]:[--closed-transform:translate3d(calc(100%+var(--drawer-inset,0px)+2px),0,0)] data-[swipe-direction=right]:[--translate-x:calc(var(--drawer-swipe-movement-x)-var(--stack-peek-offset)-(var(--stack-shrink)*100%))]",
];

// The panel rounds and borders only the edge facing the page: its top when it comes up from below.
export function edgeClasses(attr: string, sides: Record<string, "t" | "b" | "l" | "r">): string[] {
  const radius = `var(${cssVarName("drawer.radius")})`;
  const width = cssVarName("border.width");
  const corner = { t: ["tl", "tr"], b: ["bl", "br"], l: ["tl", "bl"], r: ["tr", "br"] };
  return Object.entries(sides).flatMap(([value, edge]) => [
    ...corner[edge].map((c) => `${attr}=${value}]:rounded-${c}-[${radius}]`),
    `${attr}=${value}]:border-${edge}-(length:${width})`,
  ]);
}

export function drawerParts(anatomy: Anatomy) {
  const none = { states: mapStates(() => []) };
  return {
    backdrop: flatClasses(anatomy, "backdrop", none),
    popup: flatClasses(anatomy, "popup", none),
    handle: flatClasses(anatomy, "handle", none),
    header: flatClasses(anatomy, "header", none, ["flex", "flex-col"]),
    footer: flatClasses(anatomy, "footer", none, ["mt-auto", "flex", "flex-col"]),
    title: flatClasses(anatomy, "title", none),
    description: flatClasses(anatomy, "description", none),
  };
}

// shadcn's Base UI drawer, used for React Aria too (React Aria has no drawer; shadcn does the same).
export function renderDrawer(anatomy: Anatomy): string {
  const p = drawerParts(anatomy);
  const popup = [...POPUP_MECHANICS, ...p.popup, ...edgeClasses("data-[swipe-direction", { down: "t", up: "b", left: "r", right: "l" })];
  return `import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@/lib/utils";

type DrawerContextValue = {
  hasSnapPoints: boolean;
  modal: React.ComponentProps<typeof DrawerPrimitive.Root>["modal"];
  showSwipeHandle: boolean;
  swipeDirection: NonNullable<React.ComponentProps<typeof DrawerPrimitive.Root>["swipeDirection"]>;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawer(): DrawerContextValue {
  const context = React.useContext(DrawerContext);
  if (context === null) throw new Error("Drawer parts must be used inside <Drawer>.");
  return context;
}

// swipeDirection says where it goes when dismissed: "down" is a bottom sheet, "right" a side panel.
function Drawer({ modal = true, showSwipeHandle = false, snapPoints, swipeDirection = "down", ...props }: React.ComponentProps<typeof DrawerPrimitive.Root> & { showSwipeHandle?: boolean }) {
  const hasSnapPoints = snapPoints !== undefined && snapPoints !== null && snapPoints.length > 0;
  const value = React.useMemo(() => ({ hasSnapPoints, modal, showSwipeHandle, swipeDirection }), [hasSnapPoints, modal, showSwipeHandle, swipeDirection]);
  return (
    <DrawerContext.Provider value={value}>
      <DrawerPrimitive.Root modal={modal} swipeDirection={swipeDirection} {...(snapPoints === undefined ? {} : { snapPoints })} {...props} />
    </DrawerContext.Provider>
  );
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

function DrawerOverlay({ className, ...props }: Omit<React.ComponentProps<typeof DrawerPrimitive.Backdrop>, "className"> & { className?: string }) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(${classString(["fixed", "inset-0", "z-50", "transition-opacity", "duration-450", "data-starting-style:opacity-0", "data-ending-style:opacity-0", ...p.backdrop])}, className)}
      {...props}
    />
  );
}

function DrawerSwipeHandle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="drawer-swipe-handle" aria-hidden="true" className={cn("flex shrink-0 justify-center py-3 group-data-[swipe-axis=x]/drawer-popup:hidden", className)} {...props}>
      <span className=${classString(p.handle)} />
    </div>
  );
}

function DrawerContent({ className, children, ...props }: Omit<React.ComponentProps<typeof DrawerPrimitive.Popup>, "className"> & { className?: string }) {
  const { hasSnapPoints, modal, showSwipeHandle, swipeDirection } = useDrawer();
  const swipeAxis = swipeDirection === "down" || swipeDirection === "up" ? "y" : "x";
  return (
    <DrawerPortal>
      {modal === true ? <DrawerOverlay data-snap-points={hasSnapPoints ? "" : undefined} /> : null}
      <DrawerPrimitive.Viewport data-slot="drawer-viewport" data-modal={modal} className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto">
        <DrawerPrimitive.Popup
          data-slot="drawer-popup"
          data-swipe-axis={swipeAxis}
          data-snap-points={hasSnapPoints ? "" : undefined}
          className={cn(${classString(popup)}, className)}
          {...props}
        >
          {showSwipeHandle ? <DrawerSwipeHandle /> : null}
          <DrawerPrimitive.Content data-slot="drawer-content" className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] select-text">
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-header" className={cn(${classString(p.header)}, className)} {...props} />;
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="drawer-footer" className={cn(${classString(p.footer)}, className)} {...props} />;
}

function DrawerTitle({ className, ...props }: Omit<React.ComponentProps<typeof DrawerPrimitive.Title>, "className"> & { className?: string }) {
  return <DrawerPrimitive.Title data-slot="drawer-title" className={cn(${classString(p.title)}, className)} {...props} />;
}

function DrawerDescription({ className, ...props }: Omit<React.ComponentProps<typeof DrawerPrimitive.Description>, "className"> & { className?: string }) {
  return <DrawerPrimitive.Description data-slot="drawer-description" className={cn(${classString(p.description)}, className)} {...props} />;
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
};
`;
}
