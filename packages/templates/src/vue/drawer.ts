import type { Anatomy } from "@tesserai/core";
import { drawerPieces } from "../radix/drawer";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder, plain, staticClasses } from "./sfc";

// Drawer on vaul-vue, Vaul's Vue port (built on Reka's Dialog), which the React Radix output uses:
// the same parts, `direction` (bottom, top, left or right) and data-vaul-drawer-direction, so the
// classes are the Radix output's. Reka's own Drawer is a port of Base UI's (swipe-direction, and the
// motion written in classes off its swipe variables), which the Radix preview doesn't draw.
export function renderDrawer(anatomy: Anatomy): GeneratedFile[] {
  const { slots } = drawerPieces(anatomy);
  const f = folder("drawer");

  // A vaul-vue part that passes its props through: Root, Trigger and Close.
  const part = (file: string, vaul: string, slot: string, types: { props: string; emits?: string }) =>
    f.file(
      file,
      `import type { ${[types.props, ...(types.emits === undefined ? [] : [types.emits])].join(", ")} } from "vaul-vue";
import { ${types.emits === undefined ? "" : "useForwardPropsEmits"} } from "reka-ui";
import { ${vaul} } from "vaul-vue";

const props = defineProps<${types.props}>();
${types.emits === undefined ? "" : `const emits = defineEmits<${types.emits}>();\nconst forwarded = useForwardPropsEmits(props, emits);`}`.replace(`import {  } from "reka-ui";\n`, ""),
      `<${vaul} data-slot="${slot}" v-bind="${types.emits === undefined ? "props" : "forwarded"}">
  <slot />
</${vaul}>`,
    );

  // Title and description: Reka's Dialog parts, which vaul-vue re-exports.
  const text = (file: "DrawerTitle" | "DrawerDescription", slot: string) =>
    f.file(
      file,
      `import type { ${file}Props } from "vaul-vue";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ${file} } from "vaul-vue";
import { cn } from "@/lib/utils";

const props = defineProps<${file}Props & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
      `<${file} data-slot="${slot}" v-bind="delegatedProps" :class="cn(${classList(slots[slot as "drawer-title"])}, props.class)">
  <slot />
</${file}>`,
    );

  const overlay = f.file(
    "DrawerOverlay",
    `import type { DialogOverlayProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DrawerOverlay } from "vaul-vue";
import { cn } from "@/lib/utils";

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<DrawerOverlay data-slot="drawer-overlay" v-bind="delegatedProps" :class="cn(${classList(slots["drawer-overlay"])}, props.class)" />`,
  );

  // The panel, with the overlay behind it, in a portal; a bar at its top when it comes up from below.
  const content = f.file(
    "DrawerContent",
    `import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { useForwardPropsEmits } from "reka-ui";
import { DrawerContent, DrawerPortal } from "vaul-vue";
import { cn } from "@/lib/utils";
import DrawerOverlay from "./DrawerOverlay.vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<DialogContentEmits>();
const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<DrawerPortal>
  <DrawerOverlay />
  <DrawerContent data-slot="drawer-content" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classList(slots["drawer-content"])}, props.class)">
    <div aria-hidden="true" ${staticClasses(slots["drawer-content:handle"])} />
    <slot />
  </DrawerContent>
</DrawerPortal>`,
  );

  return [
    part("Drawer", "DrawerRoot", "drawer", { props: "DrawerRootProps", emits: "DrawerRootEmits" }),
    part("DrawerTrigger", "DrawerTrigger", "drawer-trigger", { props: "DrawerTriggerProps" }),
    part("DrawerClose", "DrawerClose", "drawer-close", { props: "DrawerCloseProps" }),
    // Vaul's portal renders no element, as in React: no data-slot to carry.
    f.file("DrawerPortal", `import type { DrawerPortalProps } from "vaul-vue";\nimport { DrawerPortal } from "vaul-vue";\n\nconst props = defineProps<DrawerPortalProps>();`, `<DrawerPortal v-bind="props">\n  <slot />\n</DrawerPortal>`),
    overlay,
    content,
    plain(f, "DrawerHeader", "div", "drawer-header", classList(slots["drawer-header"])),
    plain(f, "DrawerFooter", "div", "drawer-footer", classList(slots["drawer-footer"])),
    text("DrawerTitle", "drawer-title"),
    text("DrawerDescription", "drawer-description"),
    barrel("drawer", ["Drawer", "DrawerClose", "DrawerContent", "DrawerDescription", "DrawerFooter", "DrawerHeader", "DrawerOverlay", "DrawerPortal", "DrawerTitle", "DrawerTrigger"]),
  ];
}
