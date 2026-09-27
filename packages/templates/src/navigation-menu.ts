import type { Anatomy, Base } from "@tesserai/core";
import { BASE_UI_STATES, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses, type CvaConfig } from "./factor";
import { LABEL_TRUNCATES, SHRINKS, TEXT_IN_SPAN } from "./label";
import { RADIX_STATES } from "./radix/states";

// The trigger is open while its panel shows; a link is current when it has active.
const STATES: Record<"base-ui" | "radix", StatePrefixes> = {
  "base-ui": { ...BASE_UI_STATES, open: ["data-popup-open:"], current: ["data-active:"] },
  radix: { ...RADIX_STATES, open: ["data-[state=open]:"], current: ["data-active:"] },
};

const split = (classes: string) => classes.split(" ");

// Navigation Menu's classes on Radix, which every framework's shell prints from: Reka and Bits
// mark the open trigger and panel data-state=open, a current link data-active, the panels' motion
// data-motion and the indicator data-state=visible, as Radix does, and measure the viewport into
// variables named like Radix's. The trigger's classes are navigationMenuTriggerStyle (a cva with
// only a base, exported for links styled as triggers) and "group"; the trigger ends in an
// unslotted chevron; the viewport sits in an unslotted positioning wrapper, and the indicator
// holds an unslotted arrow. Squeezed, the menu, its list and items shrink (min-w-0) and a trigger's
// label (or a link styled as one) ends in an ellipsis.
export function navigationMenuPieces(anatomy: Anatomy, states: StatePrefixes = STATES.radix) {
  const popup = flatClasses(anatomy, "popup", { states });
  const triggerStyle = flatClasses(anatomy, "trigger", { states }, ["group/navigation-menu-trigger", "inline-flex", "w-max", ...SHRINKS, "items-center", "justify-center", "outline-none", "transition-colors", "disabled:pointer-events-none", ...LABEL_TRUNCATES]);
  return {
    triggerStyle,
    slots: {
      "navigation-menu": split("group/navigation-menu relative flex min-w-0 max-w-max flex-1 items-center justify-center"),
      "navigation-menu-list": split("group flex min-w-0 flex-1 list-none items-center justify-center gap-1"),
      "navigation-menu-item": ["relative", "min-w-0"],
      "navigation-menu-trigger": { base: [...triggerStyle, "group"], variants: {}, compoundVariants: [], defaultVariants: {} } as CvaConfig,
      "navigation-menu-trigger:icon": flatClasses(anatomy, "icon", { states }, ["relative", "top-px", "transition-transform", "group-data-[state=open]/navigation-menu-trigger:rotate-180"]),
      "navigation-menu-link": flatClasses(anatomy, "link", { states }, ["flex", "items-center", "outline-none", "transition-colors", "[&_svg]:size-4"]),
      "navigation-menu-content": [
        ...flatClasses(anatomy, "content", { states }),
        "top-0",
        "left-0",
        "w-full",
        "md:absolute",
        "md:w-auto",
        "data-[motion^=from-]:animate-fade-in",
        "data-[motion^=to-]:animate-fade-out",
        "group-data-[viewport=false]/navigation-menu:top-full",
        "group-data-[viewport=false]/navigation-menu:mt-1.5",
        "group-data-[viewport=false]/navigation-menu:overflow-hidden",
        "group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-enter",
        "group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-exit",
        ...popup.map((c) => `group-data-[viewport=false]/navigation-menu:${c}`),
      ],
      "navigation-menu-viewport:wrapper": split("absolute top-full left-0 isolate z-50 flex justify-center"),
      "navigation-menu-viewport": [
        "relative",
        "mt-1.5",
        "h-(--radix-navigation-menu-viewport-height)",
        "w-full",
        "origin-top",
        "overflow-hidden",
        "md:w-(--radix-navigation-menu-viewport-width)",
        "data-[state=open]:animate-enter",
        "data-[state=closed]:animate-exit",
        ...popup,
      ],
      "navigation-menu-indicator": split("top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-fade-in data-[state=hidden]:animate-fade-out"),
      "navigation-menu-indicator:arrow": flatClasses(anatomy, "indicator", { states }, ["relative", "top-[60%]", "size-2", "rotate-45", "rounded-tl-sm"]),
    },
  };
}

// Navigation Menu as in shadcn, on Base UI and Radix. React Aria has no navigation menu and shadcn
// has none for it, so there is no React Aria template (see UNAVAILABLE in @tesserai/core).
export function navigationMenuTemplate(base: Exclude<Base, "react-aria">) {
  return (anatomy: Anatomy): string => {
    const states = STATES[base];
    const pieces = navigationMenuPieces(anatomy);
    const radix = pieces.slots;
    const trigger = base === "radix" ? pieces.triggerStyle : flatClasses(anatomy, "trigger", { states }, ["group/navigation-menu-trigger", "inline-flex", "w-max", ...SHRINKS, "items-center", "justify-center", "outline-none", "transition-colors", "disabled:pointer-events-none", ...LABEL_TRUNCATES]);
    const icon = base === "radix" ? radix["navigation-menu-trigger:icon"] : flatClasses(anatomy, "icon", { states }, ["relative", "top-px", "transition-transform", "group-data-popup-open/navigation-menu-trigger:rotate-180"]);
    const popup = flatClasses(anatomy, "popup", { states });
    const content = flatClasses(anatomy, "content", { states });
    const link = base === "radix" ? radix["navigation-menu-link"] : flatClasses(anatomy, "link", { states }, ["flex", "items-center", "outline-none", "transition-colors", "[&_svg]:size-4"]);
    const indicatorArrow = base === "radix" ? radix["navigation-menu-indicator:arrow"] : flatClasses(anatomy, "indicator", { states }, ["relative", "top-[60%]", "size-2", "rotate-45", "rounded-tl-sm"]);

    const shared = `const navigationMenuTriggerStyle = cva(${classString(trigger)});

${TEXT_IN_SPAN}

function NavigationMenuList({ className, ...props }: ${base === "radix" ? "React.ComponentProps<typeof NavigationMenuPrimitive.List>" : `Omit<React.ComponentProps<typeof NavigationMenuPrimitive.List>, "className"> & { className?: string }`}) {
  return <NavigationMenuPrimitive.List data-slot="navigation-menu-list" className={cn("group flex min-w-0 flex-1 list-none items-center justify-center gap-1", className)} {...props} />;
}

function NavigationMenuItem({ className, ...props }: ${base === "radix" ? "React.ComponentProps<typeof NavigationMenuPrimitive.Item>" : `Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Item>, "className"> & { className?: string }`}) {
  return <NavigationMenuPrimitive.Item data-slot="navigation-menu-item" className={cn("relative min-w-0", className)} {...props} />;
}

function NavigationMenuTrigger({ className, children, ...props }: ${base === "radix" ? "React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>" : `Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>, "className"> & { className?: string }`}) {
  return (
    <NavigationMenuPrimitive.Trigger data-slot="navigation-menu-trigger" className={cn(navigationMenuTriggerStyle(), "group", className)} {...props}>
      {label(children)} <ChevronDownIcon aria-hidden="true" className=${classString(icon)} />
    </NavigationMenuPrimitive.Trigger>
  );
}

// active marks the link to the page you are on.
function NavigationMenuLink({ className, children, ...props }: ${base === "radix" ? "React.ComponentProps<typeof NavigationMenuPrimitive.Link>" : `Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Link>, "className"> & { className?: string }`}) {
  return (
    <NavigationMenuPrimitive.Link data-slot="navigation-menu-link" className={cn(${classString(link)}, className)} {...props}>
      {label(children)}
    </NavigationMenuPrimitive.Link>
  );
}`;

    if (base === "radix") {
      return `import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Panels open into one shared viewport under the menu; viewport={false} lets each open under its item.
function NavigationMenu({ className, children, viewport = true, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & { viewport?: boolean }) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      className={cn("group/navigation-menu relative flex min-w-0 max-w-max flex-1 items-center justify-center", className)}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  );
}

${shared}

function NavigationMenuContent({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(
        ${classString(radix["navigation-menu-content"])},
        className,
      )}
      {...props}
    />
  );
}

function NavigationMenuViewport({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div className=${classString(radix["navigation-menu-viewport:wrapper"])}>
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        className={cn(
          ${classString(radix["navigation-menu-viewport"])},
          className,
        )}
        {...props}
      />
    </div>
  );
}

function NavigationMenuIndicator({ className, ...props }: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      className={cn(${classString(radix["navigation-menu-indicator"])}, className)}
      {...props}
    >
      <div className=${classString(indicatorArrow)} />
    </NavigationMenuPrimitive.Indicator>
  );
}

export {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
};
`;
    }

    return `import * as React from "react";
import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ClassName = { className?: string };

// Panels open into one popup that moves and resizes between items.
function NavigationMenu({
  align = "start",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Root>, "className"> & ClassName & Pick<React.ComponentProps<typeof NavigationMenuPrimitive.Positioner>, "align">) {
  return (
    <NavigationMenuPrimitive.Root data-slot="navigation-menu" className={cn("group/navigation-menu relative flex min-w-0 max-w-max flex-1 items-center justify-center", className)} {...props}>
      {children}
      <NavigationMenuPositioner align={align} />
    </NavigationMenuPrimitive.Root>
  );
}

${shared}

function NavigationMenuContent({ className, ...props }: Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Content>, "className"> & ClassName) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      className={cn(${classString([...content, "h-full", "w-auto", "transition-opacity", "duration-(--duration-base)", "data-starting-style:opacity-0", "data-ending-style:opacity-0"])}, className)}
      {...props}
    />
  );
}

function NavigationMenuPositioner({
  className,
  side = "bottom",
  sideOffset = 8,
  align = "start",
  alignOffset = 0,
  ...props
}: Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Positioner>, "className"> & ClassName) {
  return (
    <NavigationMenuPrimitive.Portal>
      <NavigationMenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn("isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-[top,left,right,bottom] duration-(--duration-base) ease-standard data-instant:transition-none", className)}
        {...props}
      >
        <NavigationMenuPrimitive.Popup
          className=${classString([
            ...popup,
            "relative",
            "h-(--popup-height)",
            "w-(--popup-width)",
            "origin-(--transform-origin)",
            "outline-none",
            "transition-[opacity,transform,width,height,scale]",
            "data-starting-style:scale-90",
            "data-starting-style:opacity-0",
            "data-ending-style:scale-90",
            "data-ending-style:opacity-0",
          ])}
        >
          <NavigationMenuPrimitive.Viewport className="relative size-full overflow-hidden" />
        </NavigationMenuPrimitive.Popup>
      </NavigationMenuPrimitive.Positioner>
    </NavigationMenuPrimitive.Portal>
  );
}

// Base UI has no indicator part; this is its icon slot drawn as shadcn's arrow.
function NavigationMenuIndicator({ className, ...props }: Omit<React.ComponentProps<typeof NavigationMenuPrimitive.Icon>, "className"> & ClassName) {
  return (
    <NavigationMenuPrimitive.Icon data-slot="navigation-menu-indicator" className={cn("top-full z-1 flex h-1.5 items-end justify-center overflow-hidden", className)} {...props}>
      <div className=${classString(indicatorArrow)} />
    </NavigationMenuPrimitive.Icon>
  );
}

export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
};
`;
  };
}
