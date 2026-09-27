import type { Anatomy } from "@tesserai/core";
import { cvaSource, q, unionType } from "../codegen";
import type { GeneratedFile } from "../render";
import { sidebarPieces } from "../sidebar";
import { attributesOf, elementPart } from "./elements";
import { indent, lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// shadcn's application sidebar, laid out as shadcn-svelte's: the provider holds the open state
// (bind:open) in a SidebarState class it sets as context (context.svelte.ts: useSidebar), below
// 768px the sidebar is a Sheet (IsMobile, svelte/reactivity's MediaQuery, in the project's hooks
// folder; false on the server), and ⌘B / Ctrl+B toggles it. The markup and classes are the React
// file's, part for part; the parts that render as another element take a `child` snippet.

const SNIPPET = `child?: Snippet<[{ props: Record<string, unknown> }]>`;

// A part that renders its element, or hands its props to a `child` snippet (shadcn-svelte's asChild).
function childPart(path: string, tag: "div" | "button" | "a", slot: string, name: string, script: { constants: string; classExpr: string; destructure?: string[]; extraProps?: string; attrs?: string }): GeneratedFile {
  const types = tag === "a" ? "HTMLAnchorAttributes" : tag === "button" ? "HTMLButtonAttributes" : "HTMLAttributes<HTMLElement>";
  return svelteFile(path, {
    script: `import type { Snippet } from "svelte";
import type { ${types.replace(/<.*$/, "")} } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}

${script.constants}

let {
  ref = $bindable(null),
  class: className,
  child,
  children,
${(script.destructure ?? []).map((d) => `  ${d},\n`).join("")}  ...restProps
}: WithElementRef<${types}> & { ${SNIPPET}${script.extraProps ?? ""} } = $props();

const mergedProps = $derived({ "data-slot": "${slot}", "data-sidebar": "${name}"${script.attrs ?? ""}, class: ${script.classExpr}, ...restProps });`,
    markup: `{#if child}
  {@render child({ props: mergedProps })}
{:else}
  <${tag} bind:this={ref} {...mergedProps}>
    {@render children?.()}
  </${tag}>
{/if}`,
  });
}

export function sidebarFiles(anatomy: Anatomy): GeneratedFile[] {
  const pieces = sidebarPieces(anatomy);
  const { slots, gap, container, sizes, defaultSize } = pieces;
  const k = (slot: keyof typeof slots) => quoted(slots[slot] as string[]);
  const DIV = attributesOf("div");
  const section = (file: string, tag: string, slot: keyof typeof slots, name: string) => elementPart(`sidebar/${file}`, tag, slot, k(slot), { attrs: [`data-sidebar="${name}"`] });

  const hook: GeneratedFile = {
    // In the project's hooks folder ($HOOKS$), as shadcn-svelte keeps it.
    path: "/hooks/is-mobile.svelte.ts",
    source: `import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 768;

// Below the breakpoint (768px) the screen counts as a phone's. False on the server.
export class IsMobile extends MediaQuery {
  constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
    super(\`max-width: \${breakpoint - 1}px\`);
  }
}
`,
  };
  const constants: GeneratedFile = {
    path: "sidebar/constants.ts",
    source: `export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";
`,
  };
  const context: GeneratedFile = {
    path: "sidebar/context.svelte.ts",
    source: `import { getContext, setContext } from "svelte";
import { IsMobile } from "$HOOKS$/is-mobile.svelte.js";
import { SIDEBAR_KEYBOARD_SHORTCUT } from "./constants.js";

type Getter<T> = () => T;

export type SidebarStateProps = {
  // The open state, read through a getter so the provider's bind:open stays the source of truth.
  open: Getter<boolean>;
  setOpen: (open: boolean) => void;
};

class SidebarState {
  readonly props: SidebarStateProps;
  open = $derived.by(() => this.props.open());
  openMobile = $state(false);
  setOpen: SidebarStateProps["setOpen"];
  #isMobile: IsMobile;
  state = $derived.by(() => (this.open ? "expanded" : "collapsed"));

  constructor(props: SidebarStateProps) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }

  get isMobile() {
    return this.#isMobile.current;
  }

  // For <svelte:window onkeydown>: ⌘B / Ctrl+B toggles the sidebar.
  handleShortcutKeydown = (e: KeyboardEvent) => {
    if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
  };

  setOpenMobile = (value: boolean) => {
    this.openMobile = value;
  };

  toggle = () => {
    return this.#isMobile.current ? (this.openMobile = !this.openMobile) : this.setOpen(!this.open);
  };
}

const SYMBOL_KEY = "scn-sidebar";

// Makes the sidebar's state and sets it as the context of the provider's children.
export function setSidebar(props: SidebarStateProps): SidebarState {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}

// The sidebar's state, from inside a Sidebar.Provider. A class instance: read its fields, don't destructure it.
export function useSidebar(): SidebarState {
  return getContext(Symbol.for(SYMBOL_KEY));
}
`,
  };

  // Holds whether the sidebar is open (bind:open; open={false} to start collapsed).
  const provider = svelteFile("sidebar/sidebar-provider.svelte", {
    script: `${DIV.import}
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME } from "./constants.js";
import { setSidebar } from "./context.svelte.js";

const classes = ${quoted(slots["sidebar-wrapper"].slice(0, 4))};
const insetClasses = ${quoted(slots["sidebar-wrapper"].slice(4))};

let {
  ref = $bindable(null),
  open = $bindable(true),
  onOpenChange = () => {},
  class: className,
  children,
  ...restProps
}: WithElementRef<${DIV.type}> & { open?: boolean; onOpenChange?: (open: boolean) => void } = $props();

const sidebar = setSidebar({
  open: () => open,
  setOpen: (value: boolean) => {
    open = value;
    onOpenChange(value);
    document.cookie = \`\${SIDEBAR_COOKIE_NAME}=\${open}; path=/; max-age=\${SIDEBAR_COOKIE_MAX_AGE}\`;
  },
});`,
    markup: `<svelte:window onkeydown={sidebar.handleShortcutKeydown} />

<div bind:this={ref} data-slot="sidebar-wrapper" class={cn(classes, insetClasses, className)} {...restProps}>
  {@render children?.()}
</div>`,
  });

  // variant: sidebar, floating or inset; collapsible: offcanvas (slides away), icon (shrinks to
  // icons) or none. side="left" is the start side: it moves to the right in right-to-left layouts.
  const sidebar = svelteFile("sidebar/sidebar.svelte", {
    script: `import type { HTMLAttributes } from "svelte/elements";
${uiImport("sheet", ["Sheet", "SheetContent", "SheetDescription", "SheetHeader", "SheetTitle"])}
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { useSidebar } from "./context.svelte.js";

const staticClasses = ${quoted(slots["sidebar:static"])};
const mobileClasses = ${quoted(pieces.mobile.slice(0, 3))};
const mobilePaint = ${quoted(pieces.mobile.slice(3))};
const mobileHeaderClasses = ${k("sidebar:mobile-header")};
const mobileInnerClasses = ${k("sidebar:mobile-inner")};
const desktopClasses = ${k("sidebar")};
const gapClasses = ${quoted(gap.base)};
const gapInset = ${quoted(gap.inset)};
const gapPlain = ${quoted(gap.plain)};
const containerClasses = ${quoted(container.base)};
const containerInset = ${quoted(container.inset)};
const containerPlain = ${quoted(container.plain)};
const innerClasses = ${k("sidebar-inner")};

let {
  ref = $bindable(null),
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLElement>> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
} = $props();

const sidebar = useSidebar();`,
    markup: `{#if collapsible === "none"}
  <aside bind:this={ref} data-slot="sidebar" class={cn(staticClasses, className)} {...restProps}>
    {@render children?.()}
  </aside>
{:else if sidebar.isMobile}
  <Sheet bind:open={() => sidebar.openMobile, (v) => sidebar.setOpenMobile(v)}>
    <SheetContent data-sidebar="sidebar" data-slot="sidebar" data-mobile="true" showCloseButton={false} class={cn(mobileClasses, mobilePaint)} {side}>
      <SheetHeader class={mobileHeaderClasses}>
        <SheetTitle>Sidebar</SheetTitle>
        <SheetDescription>Displays the mobile sidebar.</SheetDescription>
      </SheetHeader>
      <div class={mobileInnerClasses}>
        {@render children?.()}
      </div>
    </SheetContent>
  </Sheet>
{:else}
  <div
    class={desktopClasses}
    data-state={sidebar.state}
    data-collapsible={sidebar.state === "collapsed" ? collapsible : ""}
    data-variant={variant}
    data-side={side}
    data-slot="sidebar"
  >
    <!-- Keeps the page clear of the fixed sidebar. -->
    <div data-slot="sidebar-gap" class={cn(gapClasses, variant === "floating" || variant === "inset" ? gapInset : gapPlain)}></div>
    <!-- A landmark, so assistive technology can jump to it. -->
    <aside
      bind:this={ref}
      data-slot="sidebar-container"
      data-side={side}
      class={cn(containerClasses, variant === "floating" || variant === "inset" ? containerInset : containerPlain, className)}
      {...restProps}
    >
      <div data-sidebar="sidebar" data-slot="sidebar-inner" class={innerClasses}>
        {@render children?.()}
      </div>
    </aside>
  </div>
{/if}`,
  });

  const trigger = svelteFile("sidebar/sidebar-trigger.svelte", {
    script: `import type { ComponentProps } from "svelte";
${lucideImport("PanelLeftIcon")}
${uiImport("button", ["Button"])}
import { useSidebar } from "./context.svelte.js";

const iconClasses = ${k("sidebar-trigger:icon")};
const labelClasses = "sr-only";

let { ref = $bindable(null), onclick, ...restProps }: ComponentProps<typeof Button> & { onclick?: (e: MouseEvent) => void } = $props();

const sidebar = useSidebar();`,
    markup: `<Button
  bind:ref
  data-sidebar="trigger"
  data-slot="sidebar-trigger"
  variant="ghost"
  size="icon-sm"
  type="button"
  onclick={(e) => {
    onclick?.(e);
    sidebar.toggle();
  }}
  {...restProps}
>
  <PanelLeftIcon class={iconClasses} />
  <span class={labelClasses}>Toggle Sidebar</span>
</Button>`,
  });

  // A thin strip along the sidebar's edge: click to toggle.
  const rail = svelteFile("sidebar/sidebar-rail.svelte", {
    script: `import type { HTMLButtonAttributes } from "svelte/elements";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { useSidebar } from "./context.svelte.js";

const classes = ${k("sidebar-rail")};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> = $props();

const sidebar = useSidebar();`,
    markup: `<button
  bind:this={ref}
  data-sidebar="rail"
  data-slot="sidebar-rail"
  aria-label="Toggle Sidebar"
  tabindex={-1}
  onclick={sidebar.toggle}
  title="Toggle Sidebar"
  class={cn(classes, className)}
  {...restProps}
>
  {@render children?.()}
</button>`,
  });

  const input = svelteFile("sidebar/sidebar-input.svelte", {
    script: `import type { ComponentProps } from "svelte";
${uiImport("input", ["Input"])}
${UTILS_IMPORT(["cn"])}

const classes = ${k("sidebar-input")};

let { ref = $bindable(null), value = $bindable(""), class: className, ...restProps }: ComponentProps<typeof Input> = $props();`,
    markup: `<Input bind:ref bind:value data-slot="sidebar-input" data-sidebar="input" class={cn(classes, className)} {...restProps} />`,
  });

  const separator = svelteFile("sidebar/sidebar-separator.svelte", {
    script: `import type { ComponentProps } from "svelte";
${uiImport("separator", ["Separator"])}
${UTILS_IMPORT(["cn"])}

const classes = ${k("sidebar-separator")};

let { ref = $bindable(null), class: className, ...restProps }: ComponentProps<typeof Separator> = $props();`,
    markup: `<Separator bind:ref data-slot="sidebar-separator" data-sidebar="separator" class={cn(classes, className)} {...restProps} />`,
  });

  // With tooltipContent (text, or a snippet), a tooltip for when the sidebar is collapsed to icons.
  const menuButton = svelteFile("sidebar/sidebar-menu-button.svelte", {
    module: `import { cva, type VariantProps } from "class-variance-authority";
${UTILS_IMPORT(["cn"])}

export ${cvaSource("sidebarMenuButtonSizes", pieces.item)}

type Size = ${unionType(sizes)};

export type SidebarMenuButtonVariant = "default" | "outline";
export type SidebarMenuButtonSize = Size | "default";
export type SidebarMenuButtonSizes = VariantProps<typeof sidebarMenuButtonSizes>;

function resolveSize(size: SidebarMenuButtonSize | undefined): Size {
  return size === undefined || size === "default" ? ${q(defaultSize)} : size;
}

// variant="outline" gives a button its own surface and edge.
export function sidebarMenuButtonVariants({ variant = "default", size }: { variant?: SidebarMenuButtonVariant | undefined; size?: SidebarMenuButtonSize | undefined }) {
  return cn(sidebarMenuButtonSizes({ size: resolveSize(size) }), variant === "outline" && ${quoted(pieces.menuButtonOutline)});
}`,
    script: `import { mergeProps } from "bits-ui";
import type { ComponentProps, Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
${uiImport("tooltip", ["Tooltip", "TooltipContent", "TooltipTrigger"])}
import type { WithElementRef, WithoutChildrenOrChild } from "$UTILS$.js";
import { useSidebar } from "./context.svelte.js";

let {
  ref = $bindable(null),
  class: className,
  children,
  child,
  variant = "default",
  size = "default",
  isActive = false,
  tooltipContent,
  tooltipContentProps,
  ...restProps
}: WithElementRef<HTMLButtonAttributes, HTMLButtonElement> & {
  isActive?: boolean;
  variant?: SidebarMenuButtonVariant;
  size?: SidebarMenuButtonSize;
  tooltipContent?: Snippet | string;
  tooltipContentProps?: WithoutChildrenOrChild<ComponentProps<typeof TooltipContent>>;
  ${SNIPPET};
} = $props();

const sidebar = useSidebar();

// The tooltip opens only while the sidebar is collapsed to icons. Hidden, it would still open on
// focus, and the first Escape would close it rather than the mobile sheet.
const showsTooltip = $derived(sidebar.state === "collapsed" && !sidebar.isMobile);
let tooltipOpen = $state(false);

const buttonProps = $derived({
  "data-slot": "sidebar-menu-button",
  "data-sidebar": "menu-button",
  "data-size": resolveSize(size),
  "data-active": isActive || undefined,
  class: cn(sidebarMenuButtonVariants({ variant, size }), className),
  ...restProps,
});`,
    markup: `{#snippet Button({ props }: { props?: Record<string, unknown> })}
  {@const mergedProps = mergeProps(buttonProps, props)}
  {#if child}
    {@render child({ props: mergedProps })}
  {:else}
    <button bind:this={ref} {...mergedProps}>
      {@render children?.()}
    </button>
  {/if}
{/snippet}

{#if !tooltipContent}
  {@render Button({})}
{:else}
  <Tooltip bind:open={() => tooltipOpen && showsTooltip, (open) => (tooltipOpen = open && showsTooltip)}>
    <TooltipTrigger>
      {#snippet child({ props })}
        {@render Button({ props })}
      {/snippet}
    </TooltipTrigger>
    <TooltipContent side="right" align="center" hidden={!showsTooltip} {...tooltipContentProps}>
      {#if typeof tooltipContent === "string"}
        {tooltipContent}
      {:else}
        {@render tooltipContent()}
      {/if}
    </TooltipContent>
  </Tooltip>
{/if}`,
  });

  // A placeholder row while the menu loads.
  const skeleton = svelteFile("sidebar/sidebar-menu-skeleton.svelte", {
    script: `${DIV.import}
${uiImport("skeleton", ["Skeleton"])}
${UTILS_IMPORT(["cn", "type WithElementRef"])}

const classes = ${k("sidebar-menu-skeleton")};
const iconClasses = ${k("sidebar-menu-skeleton:icon")};
const textClasses = ${k("sidebar-menu-skeleton:text")};

let { ref = $bindable(null), class: className, showIcon = false, children, ...restProps }: WithElementRef<${DIV.type}> & { showIcon?: boolean } = $props();

// A width between 50% and 90%, chosen once.
const width = \`\${Math.floor(Math.random() * 40) + 50}%\`;`,
    markup: `<div bind:this={ref} data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" class={cn(classes, className)} {...restProps}>
  {#if showIcon}
    <Skeleton class={iconClasses} data-sidebar="menu-skeleton-icon" />
  {/if}
  <Skeleton class={textClasses} data-sidebar="menu-skeleton-text" style="--skeleton-width: {width};" />
  {@render children?.()}
</div>`,
  });

  const parts: [string, string, string][] = [
    ["sidebar.svelte", "Root", "Sidebar"],
    ["sidebar-content.svelte", "Content", "SidebarContent"],
    ["sidebar-footer.svelte", "Footer", "SidebarFooter"],
    ["sidebar-group.svelte", "Group", "SidebarGroup"],
    ["sidebar-group-action.svelte", "GroupAction", "SidebarGroupAction"],
    ["sidebar-group-content.svelte", "GroupContent", "SidebarGroupContent"],
    ["sidebar-group-label.svelte", "GroupLabel", "SidebarGroupLabel"],
    ["sidebar-header.svelte", "Header", "SidebarHeader"],
    ["sidebar-input.svelte", "Input", "SidebarInput"],
    ["sidebar-inset.svelte", "Inset", "SidebarInset"],
    ["sidebar-menu.svelte", "Menu", "SidebarMenu"],
    ["sidebar-menu-action.svelte", "MenuAction", "SidebarMenuAction"],
    ["sidebar-menu-badge.svelte", "MenuBadge", "SidebarMenuBadge"],
    ["sidebar-menu-button.svelte", "MenuButton", "SidebarMenuButton"],
    ["sidebar-menu-item.svelte", "MenuItem", "SidebarMenuItem"],
    ["sidebar-menu-skeleton.svelte", "MenuSkeleton", "SidebarMenuSkeleton"],
    ["sidebar-menu-sub.svelte", "MenuSub", "SidebarMenuSub"],
    ["sidebar-menu-sub-button.svelte", "MenuSubButton", "SidebarMenuSubButton"],
    ["sidebar-menu-sub-item.svelte", "MenuSubItem", "SidebarMenuSubItem"],
    ["sidebar-provider.svelte", "Provider", "SidebarProvider"],
    ["sidebar-rail.svelte", "Rail", "SidebarRail"],
    ["sidebar-separator.svelte", "Separator", "SidebarSeparator"],
    ["sidebar-trigger.svelte", "Trigger", "SidebarTrigger"],
  ];
  const index: GeneratedFile = {
    path: "sidebar/index.ts",
    source: `${parts.map(([file, short]) => `import ${short} from "./${file}";`).join("\n")}
import { useSidebar } from "./context.svelte.js";

export { sidebarMenuButtonVariants, type SidebarMenuButtonVariant, type SidebarMenuButtonSize } from "./sidebar-menu-button.svelte";

export {
${indent(parts.map(([, short]) => `${short},`).join("\n"))}
  //
${indent(parts.map(([, short, full]) => `${short} as ${full},`).join("\n"))}
  useSidebar,
};
`,
  };

  return [
    hook,
    constants,
    context,
    provider,
    sidebar,
    trigger,
    rail,
    elementPart("sidebar/sidebar-inset.svelte", "main", "sidebar-inset", k("sidebar-inset")),
    input,
    section("sidebar-header.svelte", "div", "sidebar-header", "header"),
    section("sidebar-footer.svelte", "div", "sidebar-footer", "footer"),
    separator,
    section("sidebar-content.svelte", "div", "sidebar-content", "content"),
    section("sidebar-group.svelte", "div", "sidebar-group", "group"),
    childPart("sidebar/sidebar-group-label.svelte", "div", "sidebar-group-label", "group-label", { constants: `const classes = ${k("sidebar-group-label")};`, classExpr: "cn(classes, className)" }),
    childPart("sidebar/sidebar-group-action.svelte", "button", "sidebar-group-action", "group-action", { constants: `const classes = ${k("sidebar-group-action")};`, classExpr: "cn(classes, className)" }),
    section("sidebar-group-content.svelte", "div", "sidebar-group-content", "group-content"),
    section("sidebar-menu.svelte", "ul", "sidebar-menu", "menu"),
    section("sidebar-menu-item.svelte", "li", "sidebar-menu-item", "menu-item"),
    menuButton,
    childPart("sidebar/sidebar-menu-action.svelte", "button", "sidebar-menu-action", "menu-action", {
      constants: `const classes = ${quoted(pieces.menuAction)};\nconst onHoverClasses = ${quoted(pieces.menuActionOnHover)};`,
      classExpr: "cn(classes, showOnHover && onHoverClasses, className)",
      destructure: ["showOnHover = false"],
      extraProps: "; showOnHover?: boolean",
    }),
    section("sidebar-menu-badge.svelte", "div", "sidebar-menu-badge", "menu-badge"),
    skeleton,
    section("sidebar-menu-sub.svelte", "ul", "sidebar-menu-sub", "menu-sub"),
    section("sidebar-menu-sub-item.svelte", "li", "sidebar-menu-sub-item", "menu-sub-item"),
    childPart("sidebar/sidebar-menu-sub-button.svelte", "a", "sidebar-menu-sub-button", "menu-sub-button", {
      constants: `const classes = ${k("sidebar-menu-sub-button")};`,
      classExpr: "cn(classes, className)",
      destructure: [`size = "md"`, "isActive = false"],
      extraProps: `; size?: "sm" | "md"; isActive?: boolean`,
      attrs: `, "data-size": size, "data-active": isActive || undefined`,
    }),
    index,
  ];
}
