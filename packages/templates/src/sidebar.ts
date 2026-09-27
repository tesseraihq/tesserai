import type { Anatomy, Base } from "@tesserai/core";
import { NATIVE_STATES, type StatePrefixes } from "./classes";
import { classString, cvaSource, q, unionType } from "./codegen";
import { factorClasses, flatClasses } from "./factor";

// shadcn's application sidebar, on each library's idioms (render prop, asChild, React Aria's
// elementType and Link / Button), styled from the sidebar's parts. Widths are the sidebar's tokens,
// under shadcn's variable names (--sidebar-width, --sidebar-width-icon).
const STATES: StatePrefixes = { ...NATIVE_STATES, current: ["data-active:"], disabled: ["disabled:", "aria-disabled:"] };

// Classes that depend on the sidebar's variant: always, floating or inset, and the plain sidebar.
export type ByVariant = { base: string[]; inset: string[]; plain: string[] };

// Sidebar's classes, which every framework's shell prints from. `slots` has every class an element
// can take (for the parity checks); the rest is what the shells print in pieces: the gap's and the
// container's by variant, the menu button's sizes and outline, the menu action's show-on-hover.
export function sidebarPieces(anatomy: Anatomy, states: StatePrefixes = STATES) {
  const flat = (part: string, extra: string[] = []) => flatClasses(anatomy, part, { states }, extra);
  const surface = flatClasses(anatomy, "surface", { states: NATIVE_STATES });
  const paint = surface.filter((c) => c.startsWith("bg-") || (c.startsWith("text-") && !c.startsWith("text-(length")));
  const edgeColor = surface.filter((c) => /^border-(?!\()/.test(c));
  const edgeWidth = surface.filter((c) => c.startsWith("border-(length:")).map((c) => c.slice("border-".length));
  // The edge between sidebar and page runs down the inner side; floating, it rings the panel.
  const edge = [
    ...edgeColor,
    ...edgeWidth.flatMap((w) => [`group-data-[side=left]:border-e-${w}`, `group-data-[side=right]:border-s-${w}`]),
  ];
  const floating = edgeColor.map((c) => `group-data-[variant=floating]:ring-${c.slice("border-".length)}`);
  const item = factorClasses(anatomy, "item", { states }, [
    "peer/menu-button",
    "group/menu-button",
    "flex",
    "w-full",
    "items-center",
    "overflow-hidden",
    "text-start",
    "outline-hidden",
    "transition-[width,height,padding]",
    "group-has-data-[sidebar=menu-action]/menu-item:pe-8",
    "group-data-[collapsible=icon]:size-8!",
    "group-data-[collapsible=icon]:p-2!",
    "[&_svg]:size-4",
    "[&_svg]:shrink-0",
    "[&>span:last-child]:truncate",
  ]);
  // A sub-menu row: an item's look without its sizes.
  const subButton = factorClasses(anatomy, "item", { states }, [
    "flex",
    "h-7",
    "min-w-0",
    "-translate-x-px",
    "items-center",
    "overflow-hidden",
    "outline-hidden",
    "group-data-[collapsible=icon]:hidden",
    "data-[size=sm]:text-xs",
    "[&>span:last-child]:truncate",
    "[&>svg]:size-4",
    "[&>svg]:shrink-0",
  ]).base;
  const sizes = anatomy.axes.size?.enabled ?? [];
  const defaultSize = anatomy.axes.size?.default ?? sizes[0] ?? "md";
  // Its text size is the default size's (sizes may change it).
  subButton.push(...(item.variants.size?.[defaultSize] ?? []).filter((c) => c.startsWith("text-")));
  const inset = flatClasses(anatomy, "inset", { states: NATIVE_STATES }).map((c) => `md:peer-data-[variant=inset]:${c}`);
  const rail = flatClasses(anatomy, "rail", { states: NATIVE_STATES }).filter((c) => c.startsWith("bg-")).map((c) => `hover:after:${c}`);
  const sub = flatClasses(anatomy, "sub", { states: NATIVE_STATES }).map((c) => (c.startsWith("border-(length:") ? `border-s-${c.slice("border-".length)}` : c));
  const section = (extra: string[]) => flat("section", extra);

  // Variant by variant: floating and inset leave room around the panel.
  const gap: ByVariant = {
    base: ["relative", "w-(--sidebar-width)", "bg-transparent", "transition-[width]", "duration-200", "ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180"],
    inset: ["group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"],
    plain: ["group-data-[collapsible=icon]:w-(--sidebar-width-icon)"],
  };
  const container: ByVariant = {
    base: [
      "fixed",
      "inset-y-0",
      "z-10",
      "hidden",
      "h-svh",
      "w-(--sidebar-width)",
      "transition-[inset-inline-start,inset-inline-end,width]",
      "duration-200",
      "ease-linear",
      "data-[side=left]:start-0",
      "data-[side=left]:group-data-[collapsible=offcanvas]:start-[calc(var(--sidebar-width)*-1)]",
      "data-[side=right]:end-0",
      "data-[side=right]:group-data-[collapsible=offcanvas]:end-[calc(var(--sidebar-width)*-1)]",
      "md:flex",
    ],
    inset: ["p-2", "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"],
    plain: ["group-data-[collapsible=icon]:w-(--sidebar-width-icon)", ...edge],
  };
  const byVariant = (v: ByVariant) => [...v.base, ...v.inset, ...v.plain];
  const menuButtonOutline = ["shadow-[0_0_0_1px_var(--color-neutral-border)]", ...paint.filter((c) => c.startsWith("bg-"))];
  const menuActionOnHover = ["group-focus-within/menu-item:opacity-100", "group-hover/menu-item:opacity-100", "aria-expanded:opacity-100", "md:opacity-0"];
  const menuAction = flat("action", ["absolute", "top-1.5", "end-1", "flex", "aspect-square", "w-5", "items-center", "justify-center", "p-0", "outline-hidden", "transition-transform", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", "after:absolute", "after:-inset-2", "md:after:hidden", "[&>svg]:size-4", "[&>svg]:shrink-0"]);
  const mobile = ["w-(--sidebar-width-mobile)", "max-w-none", "p-0", ...paint];
  return {
    slots: {
      "sidebar-wrapper": ["group/sidebar-wrapper", "flex", "min-h-svh", "w-full", ...paint.filter((c) => c.startsWith("bg-")).map((c) => `has-data-[variant=inset]:${c}`)],
      // The desktop sidebar, a peer the inset reads; collapsible="none" is a plain panel, and on a
      // phone the sidebar is a sheet.
      sidebar: ["group", "peer", "hidden", "md:block"],
      "sidebar:static": ["flex", "h-full", "w-(--sidebar-width)", "flex-col", ...paint],
      "sidebar:mobile": mobile,
      "sidebar:mobile-header": ["sr-only"],
      "sidebar:mobile-inner": ["flex", "h-full", "w-full", "flex-col"],
      "sidebar-gap": byVariant(gap),
      "sidebar-container": byVariant(container),
      "sidebar-inner": ["flex", "size-full", "flex-col", ...paint, "group-data-[variant=floating]:rounded-(--radius-lg)", "group-data-[variant=floating]:shadow-sm", "group-data-[variant=floating]:ring-1", ...floating],
      "sidebar-trigger:icon": ["rtl:rotate-180"],
      "sidebar-rail": [
        "absolute",
        "inset-y-0",
        "z-20",
        "hidden",
        "w-4",
        "transition-all",
        "ease-linear",
        "group-data-[side=left]:-end-4",
        "group-data-[side=right]:start-0",
        "after:absolute",
        "after:inset-y-0",
        "after:start-1/2",
        "after:w-[2px]",
        "sm:flex",
        "ltr:-translate-x-1/2",
        "rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize",
        "in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize",
        "[[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0",
        "group-data-[collapsible=offcanvas]:after:start-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-end-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-start-2",
        ...rail,
      ],
      "sidebar-inset": ["relative", "flex", "w-full", "flex-1", "flex-col", "md:peer-data-[variant=inset]:m-2", "md:peer-data-[variant=inset]:ms-0", "md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ms-2", ...inset],
      "sidebar-input": ["h-8", "w-full", "shadow-none"],
      "sidebar-header": section(["flex", "flex-col"]),
      "sidebar-footer": section(["flex", "flex-col"]),
      "sidebar-separator": ["mx-2", "w-auto"],
      "sidebar-content": ["flex", "min-h-0", "flex-1", "flex-col", "gap-2", "overflow-auto", "[scrollbar-width:none]", "group-data-[collapsible=icon]:overflow-hidden"],
      // A group's sections sit flush: its gap is the section's without the spacing between.
      "sidebar-group": section(["relative", "flex", "w-full", "min-w-0", "flex-col"]).join(" ").replace(/ gap-\([^)]*\)/, "").split(" "),
      "sidebar-group-label": flat("label", ["flex", "shrink-0", "items-center", "outline-hidden", "transition-[margin,opacity]", "duration-200", "ease-linear", "group-data-[collapsible=icon]:-mt-8", "group-data-[collapsible=icon]:opacity-0", "[&>svg]:size-4", "[&>svg]:shrink-0"]),
      "sidebar-group-action": flat("action", ["absolute", "top-3.5", "end-3", "flex", "aspect-square", "w-5", "items-center", "justify-center", "p-0", "outline-hidden", "transition-transform", "group-data-[collapsible=icon]:hidden", "after:absolute", "after:-inset-2", "md:after:hidden", "[&>svg]:size-4", "[&>svg]:shrink-0"]),
      "sidebar-group-content": ["w-full"],
      "sidebar-menu": ["flex", "w-full", "min-w-0", "flex-col", "gap-1"],
      "sidebar-menu-item": ["group/menu-item", "relative"],
      // The button's classes come from sidebarMenuButtonVariants: its sizes' cva, and the outline.
      "sidebar-menu-button": [],
      "sidebar-menu-button:sizes": item,
      "sidebar-menu-button:outline": menuButtonOutline,
      "sidebar-menu-action": [...menuAction, ...menuActionOnHover],
      "sidebar-menu-badge": flat("badge", ["pointer-events-none", "absolute", "end-1", "top-1.5", "flex", "h-5", "min-w-5", "items-center", "justify-center", "px-1", "tabular-nums", "select-none", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden"]),
      "sidebar-menu-skeleton": ["flex", "h-8", "items-center", "gap-2", "rounded-(--radius-md)", "px-2"],
      "sidebar-menu-skeleton:icon": ["size-4", "rounded-(--radius-md)"],
      "sidebar-menu-skeleton:text": ["h-4", "max-w-(--skeleton-width)", "flex-1"],
      "sidebar-menu-sub": ["mx-3.5", "flex", "min-w-0", "translate-x-px", "flex-col", "px-2.5", "py-0.5", "group-data-[collapsible=icon]:hidden", ...sub],
      "sidebar-menu-sub-item": ["group/menu-sub-item", "relative"],
      "sidebar-menu-sub-button": subButton,
    },
    gap,
    container,
    mobile,
    menuAction,
    menuActionOnHover,
    menuButtonOutline,
    item,
    sizes,
    defaultSize,
  };
}

export function sidebarTemplate(base: Base) {
  return (anatomy: Anatomy): string => {
    const pieces = sidebarPieces(anatomy);
    const { slots, gap, container, item, sizes, defaultSize } = pieces;
    const k = (slot: keyof typeof slots) => classString(slots[slot] as string[]);
    const one = (classes: string[]) => classes.join(" ");
    const aria = base === "react-aria";
    const radix = base === "radix";
    const press = aria ? "onPress" : "onClick";

    // A small element that renders as another in each library's way.
    const polyEl = (name: string, tag: "div" | "button" | "a", slot: string, sidebarName: string, classes: string, extraProps = "", extraType = "", attrs = "") => {
      if (base === "base-ui") {
        return `function ${name}({ className, render, ${extraProps}...props }: useRender.ComponentProps<"${tag}"> & React.ComponentProps<"${tag}">${extraType}) {
  return useRender({
    defaultTagName: "${tag}",
    props: mergeProps<"${tag}">({ className: cn(${classes}, className) }, props),
    render,
    state: { slot: "${slot}", sidebar: "${sidebarName}"${attrs ? `, ${attrs}` : ""} },
  });
}`;
      }
      if (radix) {
        return `function ${name}({ className, asChild = false, ${extraProps}...props }: React.ComponentProps<"${tag}"> & { asChild?: boolean }${extraType}) {
  const Comp = asChild ? Slot.Root : "${tag}";
  return <Comp data-slot="${slot}" data-sidebar="${sidebarName}"${attrs ? ` ${attrs.replace(/(\w+): ([^,]+)/g, 'data-$1={$2}')}` : ""} className={cn(${classes}, className)} {...props} />;
}`;
      }
      return `function ${name}({ className, elementType: Element = "${tag}", ${extraProps}...props }: React.HTMLAttributes<HTMLElement> & { elementType?: React.ElementType }${extraType}) {
  return <Element data-slot="${slot}" data-sidebar="${sidebarName}"${attrs ? ` ${attrs.replace(/(\w+): ([^,]+)/g, 'data-$1={$2}')}` : ""} className={cn(${classes}, className)} {...props} />;
}`;
    };

    const imports = [
      `import * as React from "react";`,
      base === "base-ui" ? `import { mergeProps } from "@base-ui/react/merge-props";\nimport { useRender } from "@base-ui/react/use-render";` : radix ? `import { Slot } from "radix-ui";` : `import { Button as ButtonPrimitive, Link as LinkPrimitive, composeRenderProps, type ButtonProps, type LinkProps } from "react-aria-components";`,
      `import { cva } from "class-variance-authority";`,
      `import { PanelLeftIcon } from "lucide-react";`,
      `import { cn } from "@/lib/utils";`,
      `import { Button } from "@/components/ui/button";`,
      `import { Input } from "@/components/ui/input";`,
      `import { Separator } from "@/components/ui/separator";`,
      aria
        ? `import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";`
        : `import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";`,
      `import { Skeleton } from "@/components/ui/skeleton";`,
      aria ? `import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";` : `import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";`,
    ].join("\n");

    const mobileSheet = aria
      ? `<Sheet
        isOpen={openMobile}
        onOpenChange={setOpenMobile}
        showCloseButton={false}
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        className={cn(${q(one(pieces.mobile.slice(0, 3)))}, ${classString(pieces.mobile.slice(3))})}
        side={side}
      >
        <SheetHeader className=${k("sidebar:mobile-header")}>
          <SheetTitle>Sidebar</SheetTitle>
          <SheetDescription>Displays the mobile sidebar.</SheetDescription>
        </SheetHeader>
        <div className=${k("sidebar:mobile-inner")}>{children}</div>
      </Sheet>`
      : `<Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          showCloseButton={false}
          className={cn(${q(one(pieces.mobile.slice(0, 3)))}, ${classString(pieces.mobile.slice(3))})}
          side={side}
        >
          <SheetHeader className=${k("sidebar:mobile-header")}>
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className=${k("sidebar:mobile-inner")}>{children}</div>
        </SheetContent>
      </Sheet>`;

    // The menu button, with a tooltip for when the sidebar is collapsed to icons.
    const menuButton =
      base === "base-ui"
        ? `function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button"> & { isActive?: boolean; tooltip?: string | React.ComponentProps<typeof TooltipContent> } & MenuButtonVariants) {
  const { isMobile, state } = useSidebar();
  const resolved = resolveSize(size);
  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">({ className: cn(sidebarMenuButtonVariants({ variant, size: resolved }), className) }, props),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: { slot: "sidebar-menu-button", sidebar: "menu-button", size: resolved, active: isActive },
  });
  if (!tooltip) return comp;
  const content = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  return (
    <Tooltip>
      {comp}
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...content} />
    </Tooltip>
  );
}`
        : radix
          ? `function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; isActive?: boolean; tooltip?: string | React.ComponentProps<typeof TooltipContent> } & MenuButtonVariants) {
  const Comp = asChild ? Slot.Root : "button";
  const { isMobile, state } = useSidebar();
  const resolved = resolveSize(size);
  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={resolved}
      data-active={isActive || undefined}
      className={cn(sidebarMenuButtonVariants({ variant, size: resolved }), className)}
      {...props}
    />
  );
  if (!tooltip) return button;
  const content = typeof tooltip === "string" ? { children: tooltip } : tooltip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile} {...content} />
    </Tooltip>
  );
}`
          : `type SidebarButtonProps = (LinkProps & { href: string }) | (ButtonProps & { href?: never });

// A link when given href, otherwise a button.
function SidebarMenuButton({
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: SidebarButtonProps & { isActive?: boolean; tooltip?: string } & MenuButtonVariants) {
  const { isMobile, state } = useSidebar();
  const resolved = resolveSize(size);
  const shared = {
    "data-slot": "sidebar-menu-button",
    "data-sidebar": "menu-button",
    "data-size": resolved,
    "data-active": isActive || undefined,
  };
  const classes = cn(sidebarMenuButtonVariants({ variant, size: resolved }), className);
  const button =
    props.href !== undefined ? (
      <LinkPrimitive {...shared} {...(props as LinkProps)} className={classes} />
    ) : (
      <ButtonPrimitive {...shared} {...(props as ButtonProps)} className={classes} />
    );
  if (!tooltip) return button;
  return (
    <TooltipTrigger isDisabled={state !== "collapsed" || isMobile}>
      {button}
      <Tooltip placement="right">{tooltip}</Tooltip>
    </TooltipTrigger>
  );
}`;

    const subButton =
      base === "base-ui"
        ? `function SidebarMenuSubButton({ render, size = "md", isActive = false, className, ...props }: useRender.ComponentProps<"a"> & React.ComponentProps<"a"> & { size?: "sm" | "md"; isActive?: boolean }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">({ className: cn(SUB_BUTTON, className) }, props),
    render,
    state: { slot: "sidebar-menu-sub-button", sidebar: "menu-sub-button", size, active: isActive },
  });
}`
        : radix
          ? `function SidebarMenuSubButton({ asChild = false, size = "md", isActive = false, className, ...props }: React.ComponentProps<"a"> & { asChild?: boolean; size?: "sm" | "md"; isActive?: boolean }) {
  const Comp = asChild ? Slot.Root : "a";
  return <Comp data-slot="sidebar-menu-sub-button" data-sidebar="menu-sub-button" data-size={size} data-active={isActive || undefined} className={cn(SUB_BUTTON, className)} {...props} />;
}`
          : `function SidebarMenuSubButton({ size = "md", isActive = false, className, ...props }: LinkProps & { size?: "sm" | "md"; isActive?: boolean }) {
  return (
    <LinkPrimitive
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive || undefined}
      className={composeRenderProps(className, (className) => cn(SUB_BUTTON, className))}
      {...props}
    />
  );
}`;

    return `${imports}

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const MOBILE_BREAKPOINT = 768;

// Below 768px the sidebar is a sheet.
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  React.useEffect(() => {
    const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

// Holds whether the sidebar is open; ⌘B / Ctrl+B toggles it.
function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { defaultOpen?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) setOpenProp(openState);
      else _setOpen(openState);
      document.cookie = \`\${SIDEBAR_COOKIE_NAME}=\${openState}; path=/; max-age=\${SIDEBAR_COOKIE_MAX_AGE}\`;
    },
    [setOpenProp, open],
  );
  const toggleSidebar = React.useCallback(() => (isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o)), [isMobile, setOpen]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? "expanded" : "collapsed";
  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div data-slot="sidebar-wrapper" className={cn(${q(one(slots["sidebar-wrapper"].slice(0, 4)))}, ${classString(slots["sidebar-wrapper"].slice(4))}, className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// variant: sidebar, floating or inset; collapsible: offcanvas (slides away), icon (shrinks to icons) or none.
// side="left" is the start side: it moves to the right in right-to-left layouts.
function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { side?: "left" | "right"; variant?: "sidebar" | "floating" | "inset"; collapsible?: "offcanvas" | "icon" | "none" }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === "none") {
    return (
      <aside data-slot="sidebar" className={cn(${q(one(slots["sidebar:static"].slice(0, 4)))}, ${classString(slots["sidebar:static"].slice(4))}, className)} {...(props as React.ComponentProps<"aside">)}>
        {children}
      </aside>
    );
  }

  if (isMobile) {
    return (
      ${mobileSheet}
    );
  }

  return (
    <div
      className=${k("sidebar")}
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Keeps the page clear of the fixed sidebar. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          ${q(one(gap.base.slice(0, 6)))},
          ${q(gap.base[6]!)},
          ${q(gap.base[7]!)},
          variant === "floating" || variant === "inset" ? ${classString(gap.inset)} : ${classString(gap.plain)},
        )}
      />
      {/* A landmark, so assistive technology can jump to it. */}
      <aside
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          ${classString(container.base)},
          variant === "floating" || variant === "inset" ? ${classString(container.inset)} : cn(${q(container.plain[0]!)}, ${classString(container.plain.slice(1))}),
          className,
        )}
        {...(props as React.ComponentProps<"aside">)}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className=${k("sidebar-inner")}
        >
          {children}
        </div>
      </aside>
    </div>
  );
}

function SidebarTrigger({ ${press}, ...props }: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      ${press}={(event) => {
        ${press}?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className=${k("sidebar-trigger:icon")} />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

// A thin strip along the sidebar's edge: click to toggle.
function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        ${k("sidebar-rail")},
        className,
      )}
      {...props}
    />
  );
}

// The page beside the sidebar; with variant="inset" it sits on the sidebar's surface as a card.
function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        ${k("sidebar-inset")},
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input data-slot="sidebar-input" data-sidebar="input" className={cn(${k("sidebar-input")}, className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" data-sidebar="header" className={cn(${k("sidebar-header")}, className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" data-sidebar="footer" className={cn(${k("sidebar-footer")}, className)} {...props} />;
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator data-slot="sidebar-separator" data-sidebar="separator" className={cn(${k("sidebar-separator")}, className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(${k("sidebar-content")}, className)}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" data-sidebar="group" className={cn(${k("sidebar-group")}, className)} {...props} />;
}

${polyEl(
  "SidebarGroupLabel",
  "div",
  "sidebar-group-label",
  "group-label",
  k("sidebar-group-label"),
)}

${polyEl(
  "SidebarGroupAction",
  "button",
  "sidebar-group-action",
  "group-action",
  k("sidebar-group-action"),
)}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" data-sidebar="group-content" className={cn(${k("sidebar-group-content")}, className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" data-sidebar="menu" className={cn(${k("sidebar-menu")}, className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn(${k("sidebar-menu-item")}, className)} {...props} />;
}

${cvaSource("sidebarMenuButtonSizes", item)}

type Size = ${unionType(sizes)};

function resolveSize(size: Size | "default" | null | undefined): Size {
  return size === undefined || size === null || size === "default" ? ${q(defaultSize)} : size;
}

// variant="outline" gives a button its own surface and edge.
const sidebarMenuButtonVariants = ({ variant = "default", size }: { variant?: "default" | "outline" | null | undefined; size: Size }) =>
  cn(sidebarMenuButtonSizes({ size }), variant === "outline" && ${classString(pieces.menuButtonOutline)});

type MenuButtonVariants = { variant?: "default" | "outline" | null | undefined; size?: Size | "default" | null | undefined };

${menuButton}

${polyEl(
  "SidebarMenuAction",
  "button",
  "sidebar-menu-action",
  "menu-action",
  `cn(${classString(pieces.menuAction)}, showOnHover && ${classString(pieces.menuActionOnHover)})`,
  "showOnHover = false, ",
  " & { showOnHover?: boolean }",
)}

// A count beside a menu button.
function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(${k("sidebar-menu-badge")}, className)}
      {...props}
    />
  );
}

// A placeholder row while the menu loads.
function SidebarMenuSkeleton({ className, showIcon = false, ...props }: React.ComponentProps<"div"> & { showIcon?: boolean }) {
  const [width] = React.useState(() => \`\${Math.floor(Math.random() * 40) + 50}%\`);
  return (
    <div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" className={cn(${k("sidebar-menu-skeleton")}, className)} {...props}>
      {showIcon && <Skeleton className=${k("sidebar-menu-skeleton:icon")} data-sidebar="menu-skeleton-icon" />}
      <Skeleton className=${k("sidebar-menu-skeleton:text")} data-sidebar="menu-skeleton-text" style={{ "--skeleton-width": width } as React.CSSProperties} />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(${k("sidebar-menu-sub")}, className)}
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn(${k("sidebar-menu-sub-item")}, className)} {...props} />;
}

const SUB_BUTTON = ${k("sidebar-menu-sub-button")};

${subButton}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useIsMobile,
  useSidebar,
};
`;
  };
}
