import type { Anatomy } from "@tesserai/core";
import { navigationMenuPieces } from "../navigation-menu";
import type { GeneratedFile } from "../render";
import { bitsImport, indexFile, indexParts, lucideImport, partFile, quoted, svelteFile, UTILS_IMPORT } from "./emit";
import { bitsVars } from "./states";

// Navigation Menu on Bits, which marks it as Radix does (data-state on an open trigger and panel,
// data-motion on a panel moving in or out, data-active on the current link) and measures the
// viewport into --bits-navigation-menu-viewport-width and -height.
export function navigationMenuFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, triggerStyle } = bitsVars(navigationMenuPieces(anatomy));
  const part = (file: string, name: string, extra: object = {}) =>
    partFile({ path: `navigation-menu/${file}`, imports: [bitsImport("NavigationMenu")], props: `NavigationMenuPrimitive.${name}Props`, tag: `NavigationMenuPrimitive.${name}`, ...extra });
  return [
    // Panels open into one shared viewport under the menu; viewport={false} opens each under its item.
    svelteFile("navigation-menu/navigation-menu.svelte", {
      script: `${bitsImport("NavigationMenu")}
${UTILS_IMPORT(["cn"])}
import NavigationMenuViewport from "./navigation-menu-viewport.svelte";

const classes = ${quoted(slots["navigation-menu"])};

let {
  ref = $bindable(null),
  value = $bindable(""),
  class: className,
  viewport = true,
  children,
  ...restProps
}: NavigationMenuPrimitive.RootProps & { viewport?: boolean } = $props();`,
      markup: `<NavigationMenuPrimitive.Root bind:ref bind:value data-slot="navigation-menu" data-viewport={viewport} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  {#if viewport}
    <NavigationMenuViewport />
  {/if}
</NavigationMenuPrimitive.Root>`,
    }),
    part("navigation-menu-list.svelte", "List", { slot: "navigation-menu-list", classes: quoted(slots["navigation-menu-list"]) }),
    part("navigation-menu-item.svelte", "Item", { slot: "navigation-menu-item", classes: quoted(slots["navigation-menu-item"]) }),
    // navigationMenuTriggerStyle styles a link as a trigger.
    svelteFile("navigation-menu/navigation-menu-trigger.svelte", {
      module: `import { cva } from "class-variance-authority";

export const navigationMenuTriggerStyle = cva(${quoted(triggerStyle)});`,
      script: `${bitsImport("NavigationMenu")}
${lucideImport("ChevronDownIcon")}
${UTILS_IMPORT(["cn"])}

const iconClasses = ${quoted(slots["navigation-menu-trigger:icon"])};

let { ref = $bindable(null), class: className, children, ...restProps }: NavigationMenuPrimitive.TriggerProps = $props();`,
      markup: `<NavigationMenuPrimitive.Trigger bind:ref data-slot="navigation-menu-trigger" class={cn(navigationMenuTriggerStyle(), "group", className)} {...restProps}>
  {@render children?.()}
  <ChevronDownIcon aria-hidden="true" class={iconClasses} />
</NavigationMenuPrimitive.Trigger>`,
    }),
    part("navigation-menu-content.svelte", "Content", { slot: "navigation-menu-content", classes: quoted(slots["navigation-menu-content"]) }),
    // active marks the link to the page you are on.
    part("navigation-menu-link.svelte", "Link", { slot: "navigation-menu-link", classes: quoted(slots["navigation-menu-link"]) }),
    svelteFile("navigation-menu/navigation-menu-viewport.svelte", {
      script: `${bitsImport("NavigationMenu")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["navigation-menu-viewport"])};
const wrapperClasses = ${quoted(slots["navigation-menu-viewport:wrapper"])};

let { ref = $bindable(null), class: className, ...restProps }: NavigationMenuPrimitive.ViewportProps = $props();`,
      markup: `<div class={wrapperClasses}>
  <NavigationMenuPrimitive.Viewport bind:ref data-slot="navigation-menu-viewport" class={cn(classes, className)} {...restProps} />
</div>`,
    }),
    svelteFile("navigation-menu/navigation-menu-indicator.svelte", {
      script: `${bitsImport("NavigationMenu")}
${UTILS_IMPORT(["cn"])}

const classes = ${quoted(slots["navigation-menu-indicator"])};
const arrowClasses = ${quoted(slots["navigation-menu-indicator:arrow"])};

let { ref = $bindable(null), class: className, ...restProps }: NavigationMenuPrimitive.IndicatorProps = $props();`,
      markup: `<NavigationMenuPrimitive.Indicator bind:ref data-slot="navigation-menu-indicator" class={cn(classes, className)} {...restProps}>
  <div class={arrowClasses}></div>
</NavigationMenuPrimitive.Indicator>`,
    }),
    indexFile(
      "navigation-menu/index.ts",
      indexParts([
        ["navigation-menu.svelte", "Root", "NavigationMenu"],
        ["navigation-menu-list.svelte", "List", "NavigationMenuList"],
        ["navigation-menu-item.svelte", "Item", "NavigationMenuItem"],
        ["navigation-menu-trigger.svelte", "Trigger", "NavigationMenuTrigger"],
        ["navigation-menu-content.svelte", "Content", "NavigationMenuContent"],
        ["navigation-menu-link.svelte", "Link", "NavigationMenuLink"],
        ["navigation-menu-indicator.svelte", "Indicator", "NavigationMenuIndicator"],
        ["navigation-menu-viewport.svelte", "Viewport", "NavigationMenuViewport"],
      ]),
      [{ file: "navigation-menu-trigger.svelte", names: ["navigationMenuTriggerStyle"] }],
    ),
  ];
}
