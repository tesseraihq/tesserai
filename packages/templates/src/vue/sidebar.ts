import type { Anatomy } from "@tesserai/core";
import { q, unionType } from "../codegen";
import { LUCIDE_PACKAGES } from "../icons";
import type { GeneratedFile } from "../render";
import { sidebarPieces, type ByVariant } from "../sidebar";
import { barrel, classList, exportedCva, folder, plain, staticClasses } from "./sfc";

// shadcn's application sidebar, laid out as shadcn-vue's: the provider holds the open state and
// provides it (utils.ts: useSidebar), below 768px the sidebar is a Sheet (useIsMobile, VueUse's
// media query, false on the server), and ⌘B / Ctrl+B toggles it. The markup and classes are the
// React file's, part for part; the parts that render as another element take Reka's as / as-child.

// A cn argument list for an element placed by the sidebar's variant.
const byVariant = (v: ByVariant, plainArgs: string) => `variant === 'floating' || variant === 'inset' ? ${classList(v.inset)} : ${plainArgs}`;

export function renderSidebar(anatomy: Anatomy): GeneratedFile[] {
  const pieces = sidebarPieces(anatomy);
  const { slots, gap, container, sizes, defaultSize } = pieces;
  const f = folder("sidebar");
  const s = (slot: keyof typeof slots) => classList(slots[slot] as string[]);

  const utils: GeneratedFile = {
    path: "sidebar/utils.ts",
    source: `import type { ComputedRef, Ref } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { createContext } from "reka-ui";

export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
export const SIDEBAR_KEYBOARD_SHORTCUT = "b";
export const MOBILE_BREAKPOINT = 768;

// Below 768px the sidebar is a sheet. False on the server, where there's no screen to measure.
export function useIsMobile(): Ref<boolean> {
  return useMediaQuery(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
}

export const [useSidebar, provideSidebarContext] = createContext<{
  state: ComputedRef<"expanded" | "collapsed">;
  open: Ref<boolean>;
  setOpen: (value: boolean) => void;
  isMobile: Ref<boolean>;
  openMobile: Ref<boolean>;
  setOpenMobile: (value: boolean) => void;
  toggleSidebar: () => void;
}>("Sidebar");
`,
  };

  // Holds whether the sidebar is open (v-model:open, or default-open); ⌘B / Ctrl+B toggles it.
  const provider = f.file(
    "SidebarProvider",
    `import type { HTMLAttributes, Ref } from "vue";
import { useEventListener, useVModel } from "@vueuse/core";
import { computed, ref } from "vue";
import { cn } from "@/lib/utils";
import { provideSidebarContext, SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, useIsMobile } from "./utils";

const props = withDefaults(defineProps<{ defaultOpen?: boolean; open?: boolean; class?: HTMLAttributes["class"] }>(), { defaultOpen: true, open: undefined });
const emits = defineEmits<{ "update:open": [open: boolean] }>();

const isMobile = useIsMobile();
const openMobile = ref(false);
const open = useVModel(props, "open", emits, { defaultValue: props.defaultOpen, passive: (props.open === undefined) as false }) as Ref<boolean>;

function setOpen(value: boolean) {
  open.value = value;
  document.cookie = \`\${SIDEBAR_COOKIE_NAME}=\${value}; path=/; max-age=\${SIDEBAR_COOKIE_MAX_AGE}\`;
}
function setOpenMobile(value: boolean) {
  openMobile.value = value;
}
function toggleSidebar() {
  return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value);
}

useEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    toggleSidebar();
  }
});

const state = computed(() => (open.value ? "expanded" : "collapsed"));
provideSidebarContext({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar });`,
    `<div data-slot="sidebar-wrapper" :class="cn(${classList(slots["sidebar-wrapper"].slice(0, 4))}, ${classList(slots["sidebar-wrapper"].slice(4))}, props.class)">
  <slot />
</div>`,
  );

  // variant: sidebar, floating or inset; collapsible: offcanvas (slides away), icon (shrinks to
  // icons) or none. side="left" is the start side: it moves to the right in right-to-left layouts.
  const sidebar = f.file(
    "Sidebar",
    `import type { SidebarProps } from ".";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "./utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SidebarProps>(), { side: "left", variant: "sidebar", collapsible: "offcanvas" });
const { isMobile, state, openMobile, setOpenMobile } = useSidebar();`,
    `<aside v-if="collapsible === 'none'" data-slot="sidebar" :class="cn(${classList(slots["sidebar:static"].slice(0, 4))}, ${classList(slots["sidebar:static"].slice(4))}, props.class)" v-bind="$attrs">
  <slot />
</aside>

<Sheet v-else-if="isMobile" :open="openMobile" @update:open="setOpenMobile">
  <SheetContent
    data-sidebar="sidebar"
    data-slot="sidebar"
    data-mobile="true"
    :show-close-button="false"
    :class="cn(${classList(pieces.mobile.slice(0, 3))}, ${classList(pieces.mobile.slice(3))})"
    :side="side"
  >
    <SheetHeader ${staticClasses(slots["sidebar:mobile-header"])}>
      <SheetTitle>Sidebar</SheetTitle>
      <SheetDescription>Displays the mobile sidebar.</SheetDescription>
    </SheetHeader>
    <div ${staticClasses(slots["sidebar:mobile-inner"])}>
      <slot />
    </div>
  </SheetContent>
</Sheet>

<div
  v-else
  ${staticClasses(slots.sidebar)}
  :data-state="state"
  :data-collapsible="state === 'collapsed' ? collapsible : ''"
  :data-variant="variant"
  :data-side="side"
  data-slot="sidebar"
>
  <!-- Keeps the page clear of the fixed sidebar. -->
  <div
    data-slot="sidebar-gap"
    :class="cn(${classList(gap.base.slice(0, 6))}, ${classList(gap.base.slice(6, 7))}, ${classList(gap.base.slice(7))}, ${byVariant(gap, classList(gap.plain))})"
  />
  <!-- A landmark, so assistive technology can jump to it. -->
  <aside
    data-slot="sidebar-container"
    :data-side="side"
    :class="cn(${classList(container.base)}, ${byVariant(container, `cn(${classList(container.plain.slice(0, 1))}, ${classList(container.plain.slice(1))})`)}, props.class)"
    v-bind="$attrs"
  >
    <div data-sidebar="sidebar" data-slot="sidebar-inner" ${staticClasses(slots["sidebar-inner"])}>
      <slot />
    </div>
  </aside>
</div>`,
  );

  const trigger = f.file(
    "SidebarTrigger",
    `import { PanelLeftIcon } from "${LUCIDE_PACKAGES.vue}";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./utils";

const { toggleSidebar } = useSidebar();`,
    `<Button data-sidebar="trigger" data-slot="sidebar-trigger" variant="ghost" size="icon-sm" @click="toggleSidebar">
  <PanelLeftIcon ${staticClasses(slots["sidebar-trigger:icon"])} />
  <span class="sr-only">Toggle Sidebar</span>
</Button>`,
  );

  // A thin strip along the sidebar's edge: click to toggle.
  const rail = f.file(
    "SidebarRail",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { useSidebar } from "./utils";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const { toggleSidebar } = useSidebar();`,
    `<button data-sidebar="rail" data-slot="sidebar-rail" aria-label="Toggle Sidebar" :tabindex="-1" title="Toggle Sidebar" :class="cn(${s("sidebar-rail")}, props.class)" @click="toggleSidebar">
  <slot />
</button>`,
  );

  const input = f.file(
    "SidebarInput",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<Input data-slot="sidebar-input" data-sidebar="input" :class="cn(${s("sidebar-input")}, props.class)" />`,
  );

  const separator = f.file(
    "SidebarSeparator",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();`,
    `<Separator data-slot="sidebar-separator" data-sidebar="separator" :class="cn(${s("sidebar-separator")}, props.class)" />`,
  );

  // A part that renders as another element (as, or as-child around a router's link).
  const primitive = (file: string, tag: string, slot: string, sidebarName: string, classes: string, extra = { props: "", defaults: "", attrs: "" }) =>
    f.file(
      file,
      `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<PrimitiveProps & { class?: HTMLAttributes["class"]${extra.props} }>(), { as: "${tag}"${extra.defaults} });`,
      `<Primitive data-slot="${slot}" data-sidebar="${sidebarName}"${extra.attrs} :as="as" :as-child="asChild" :class="cn(${classes}, props.class)">
  <slot />
</Primitive>`,
    );

  const menuButtonChild = f.file(
    "SidebarMenuButtonChild",
    `import type { PrimitiveProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import type { SidebarMenuButtonVariants } from ".";
import { computed } from "vue";
import { Primitive } from "reka-ui";
import { cn } from "@/lib/utils";
import { resolveSidebarMenuButtonSize, sidebarMenuButtonVariants } from ".";

export interface SidebarMenuButtonProps extends PrimitiveProps {
  variant?: SidebarMenuButtonVariants["variant"];
  size?: SidebarMenuButtonVariants["size"];
  isActive?: boolean;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), { as: "button", variant: "default", size: "default" });
const resolved = computed(() => resolveSidebarMenuButtonSize(props.size));`,
    `<Primitive
  data-slot="sidebar-menu-button"
  data-sidebar="menu-button"
  :data-size="resolved"
  :data-active="isActive || undefined"
  :as="as"
  :as-child="asChild"
  :class="cn(sidebarMenuButtonVariants({ variant, size: resolved }), props.class)"
>
  <slot />
</Primitive>`,
  );
  // With a tooltip, shown when the sidebar is collapsed to icons.
  const menuButton = f.file(
    "SidebarMenuButton",
    `import type { Component } from "vue";
import type { SidebarMenuButtonProps } from "./SidebarMenuButtonChild.vue";
import { reactiveOmit } from "@vueuse/core";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SidebarMenuButtonChild from "./SidebarMenuButtonChild.vue";
import { useSidebar } from "./utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<SidebarMenuButtonProps & { tooltip?: string | Component }>(), { as: "button", variant: "default", size: "default" });
const { isMobile, state } = useSidebar();
const delegatedProps = reactiveOmit(props, "tooltip");`,
    `<SidebarMenuButtonChild v-if="!tooltip" v-bind="{ ...delegatedProps, ...$attrs }">
  <slot />
</SidebarMenuButtonChild>

<Tooltip v-else>
  <TooltipTrigger as-child>
    <SidebarMenuButtonChild v-bind="{ ...delegatedProps, ...$attrs }">
      <slot />
    </SidebarMenuButtonChild>
  </TooltipTrigger>
  <TooltipContent side="right" align="center" :hidden="state !== 'collapsed' || isMobile">
    <template v-if="typeof tooltip === 'string'">
      {{ tooltip }}
    </template>
    <component :is="tooltip" v-else />
  </TooltipContent>
</Tooltip>`,
  );

  const skeleton = f.file(
    "SidebarMenuSkeleton",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const props = defineProps<{ class?: HTMLAttributes["class"]; showIcon?: boolean }>();
// A placeholder row's width, 50 to 90%, chosen once.
const width = \`\${Math.floor(Math.random() * 40) + 50}%\`;`,
    `<div data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" :class="cn(${s("sidebar-menu-skeleton")}, props.class)">
  <Skeleton v-if="showIcon" ${staticClasses(slots["sidebar-menu-skeleton:icon"])} data-sidebar="menu-skeleton-icon" />
  <Skeleton ${staticClasses(slots["sidebar-menu-skeleton:text"])} data-sidebar="menu-skeleton-text" :style="{ '--skeleton-width': width }" />
</div>`,
  );

  const section = (file: string, tag: string, slot: string, name: string) => plain(f, file, tag, slot, s(slot as keyof typeof slots), `data-sidebar="${name}"`);

  const index = `import type { VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  class?: HTMLAttributes["class"];
}

${exportedCva("sidebarMenuButtonSizes", pieces.item)}

type Size = ${unionType(sizes)};

export function resolveSidebarMenuButtonSize(size: Size | "default" | null | undefined): Size {
  return size === undefined || size === null || size === "default" ? ${q(defaultSize)} : size;
}

// variant="outline" gives a button its own surface and edge.
export const sidebarMenuButtonVariants = ({ variant = "default", size }: { variant?: "default" | "outline" | null | undefined; size: Size }) =>
  cn(sidebarMenuButtonSizes({ size }), variant === "outline" && ${JSON.stringify(pieces.menuButtonOutline.join(" "))});

export type SidebarMenuButtonVariants = { variant?: "default" | "outline" | null | undefined; size?: Size | "default" | null | undefined };
export type SidebarMenuButtonSizes = VariantProps<typeof sidebarMenuButtonSizes>;

export { useIsMobile, useSidebar } from "./utils";`;

  return [
    utils,
    provider,
    sidebar,
    trigger,
    rail,
    plain(f, "SidebarInset", "main", "sidebar-inset", s("sidebar-inset")),
    input,
    section("SidebarHeader", "div", "sidebar-header", "header"),
    section("SidebarFooter", "div", "sidebar-footer", "footer"),
    separator,
    section("SidebarContent", "div", "sidebar-content", "content"),
    section("SidebarGroup", "div", "sidebar-group", "group"),
    primitive("SidebarGroupLabel", "div", "sidebar-group-label", "group-label", s("sidebar-group-label")),
    primitive("SidebarGroupAction", "button", "sidebar-group-action", "group-action", s("sidebar-group-action")),
    section("SidebarGroupContent", "div", "sidebar-group-content", "group-content"),
    section("SidebarMenu", "ul", "sidebar-menu", "menu"),
    section("SidebarMenuItem", "li", "sidebar-menu-item", "menu-item"),
    menuButtonChild,
    menuButton,
    primitive("SidebarMenuAction", "button", "sidebar-menu-action", "menu-action", `cn(${classList(pieces.menuAction)}, showOnHover && ${classList(pieces.menuActionOnHover)})`, {
      props: "; showOnHover?: boolean",
      defaults: "",
      attrs: "",
    }),
    // A count beside a menu button.
    section("SidebarMenuBadge", "div", "sidebar-menu-badge", "menu-badge"),
    skeleton,
    section("SidebarMenuSub", "ul", "sidebar-menu-sub", "menu-sub"),
    section("SidebarMenuSubItem", "li", "sidebar-menu-sub-item", "menu-sub-item"),
    primitive("SidebarMenuSubButton", "a", "sidebar-menu-sub-button", "menu-sub-button", s("sidebar-menu-sub-button"), {
      props: `; size?: "sm" | "md"; isActive?: boolean`,
      defaults: `, size: "md"`,
      attrs: ` :data-size="size" :data-active="isActive || undefined"`,
    }),
    barrel(
      "sidebar",
      [
        "Sidebar",
        "SidebarContent",
        "SidebarFooter",
        "SidebarGroup",
        "SidebarGroupAction",
        "SidebarGroupContent",
        "SidebarGroupLabel",
        "SidebarHeader",
        "SidebarInput",
        "SidebarInset",
        "SidebarMenu",
        "SidebarMenuAction",
        "SidebarMenuBadge",
        "SidebarMenuButton",
        "SidebarMenuItem",
        "SidebarMenuSkeleton",
        "SidebarMenuSub",
        "SidebarMenuSubButton",
        "SidebarMenuSubItem",
        "SidebarProvider",
        "SidebarRail",
        "SidebarSeparator",
        "SidebarTrigger",
      ],
      index,
    ),
  ];
}
