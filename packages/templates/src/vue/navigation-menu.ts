import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import { navigationMenuPieces } from "../navigation-menu";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, staticClasses, styled } from "./sfc";

// Navigation Menu on Reka's parts, which mark state as Radix's do (data-state on an open trigger and
// panel, data-motion on a panel moving in or out, data-active on the current link) and measure the
// viewport into --reka-navigation-menu-viewport-width and -height: the Radix output's classes, the
// variables renamed.
export function renderNavigationMenu(anatomy: Anatomy): GeneratedFile[] {
  const { slots, triggerStyle } = navigationMenuPieces(anatomy);
  const f = folder("navigation-menu");

  // Panels open into one shared viewport under the menu; :viewport="false" opens each under its item.
  const root = f.file(
    "NavigationMenu",
    `import type { NavigationMenuRootEmits, NavigationMenuRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import NavigationMenuViewport from "./NavigationMenuViewport.vue";

const props = withDefaults(defineProps<NavigationMenuRootProps & { class?: HTMLAttributes["class"]; viewport?: boolean }>(), { viewport: true });
const emits = defineEmits<NavigationMenuRootEmits>();
const delegatedProps = reactiveOmit(props, "class", "viewport");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<NavigationMenuRoot v-slot="slotProps" data-slot="navigation-menu" :data-viewport="viewport" v-bind="forwarded" :class="cn(${classList(slots["navigation-menu"])}, props.class)">
  <slot v-bind="slotProps" />
  <NavigationMenuViewport v-if="viewport" />
</NavigationMenuRoot>`,
  );

  // React writes a space between the label and the chevron, which a flex row doesn't draw.
  const trigger = f.file(
    "NavigationMenuTrigger",
    `import type { NavigationMenuTriggerProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { ChevronDownIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuTrigger, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";
import { navigationMenuTriggerStyle } from ".";

const props = defineProps<NavigationMenuTriggerProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<NavigationMenuTrigger data-slot="navigation-menu-trigger" v-bind="forwarded" :class="cn(navigationMenuTriggerStyle(), 'group', props.class)">
  <slot />
  <ChevronDownIcon aria-hidden="true" ${staticClasses(slots["navigation-menu-trigger:icon"])} />
</NavigationMenuTrigger>`,
  );

  const viewport = f.file(
    "NavigationMenuViewport",
    `import type { NavigationMenuViewportProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuViewport, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<NavigationMenuViewportProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<div ${staticClasses(slots["navigation-menu-viewport:wrapper"])}>
  <NavigationMenuViewport data-slot="navigation-menu-viewport" v-bind="forwarded" :class="cn(${classList(slots["navigation-menu-viewport"])}, props.class)" />
</div>`,
  );

  const indicator = f.file(
    "NavigationMenuIndicator",
    `import type { NavigationMenuIndicatorProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuIndicator, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<NavigationMenuIndicatorProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);`,
    `<NavigationMenuIndicator data-slot="navigation-menu-indicator" v-bind="forwarded" :class="cn(${classList(slots["navigation-menu-indicator"])}, props.class)">
  <div ${staticClasses(slots["navigation-menu-indicator:arrow"])} />
</NavigationMenuIndicator>`,
  );

  return [
    root,
    styled(f, "NavigationMenuList", "NavigationMenuList", "navigation-menu-list", classList(slots["navigation-menu-list"])),
    styled(f, "NavigationMenuItem", "NavigationMenuItem", "navigation-menu-item", classList(slots["navigation-menu-item"])),
    trigger,
    styled(f, "NavigationMenuContent", "NavigationMenuContent", "navigation-menu-content", classList(slots["navigation-menu-content"]), { emits: true }),
    // active marks the link to the page you are on.
    styled(f, "NavigationMenuLink", "NavigationMenuLink", "navigation-menu-link", classList(slots["navigation-menu-link"]), { emits: true }),
    indicator,
    viewport,
    barrel(
      "navigation-menu",
      ["NavigationMenu", "NavigationMenuContent", "NavigationMenuIndicator", "NavigationMenuItem", "NavigationMenuLink", "NavigationMenuList", "NavigationMenuTrigger", "NavigationMenuViewport"],
      `import { cva } from "class-variance-authority";

export const navigationMenuTriggerStyle = cva(${JSON.stringify(triggerStyle.join(" "))});`,
    ),
  ];
}
