import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import { modalClasses } from "../modal";
import type { GeneratedFile } from "../render";
import { classArg, partExports, sfc, staticClass } from "./sfc";

const PARTS = ["Dialog", "DialogClose", "DialogContent", "DialogDescription", "DialogFooter", "DialogHeader", "DialogOverlay", "DialogPortal", "DialogTitle", "DialogTrigger"];

// Dialog on Reka's Dialog parts, one file per part as in shadcn-vue. The classes are Radix's
// (Reka marks open and closed with the same data-state), so they're modalClasses' Radix output.
export function renderDialog(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "dialog", "radix");
  const file = (name: string, script: string, template: string) => sfc(`dialog/${name}.vue`, script, template);

  // A Reka part with no classes or events of its own: its data-slot, and its props passed through.
  const passthrough = (name: string, slot: string | null) =>
    file(
      name,
      `import type { ${name}Props } from "reka-ui";
import { ${name} } from "reka-ui";

const props = defineProps<${name}Props>();`,
      `<${name}${slot === null ? "" : ` data-slot="${slot}"`} v-bind="props">
  <slot />
</${name}>`,
    );

  // A Reka part with classes: the class prop is merged in with cn, the rest passed through.
  const styled = (name: string, slot: string, classes: string) =>
    file(
      name,
      `import type { ${name}Props } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { ${name}, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<${name}Props & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);`,
      `<${name} data-slot="${slot}" v-bind="forwardedProps" :class="cn(${classArg(classes)}, props.class)">
  <slot />
</${name}>`,
    );

  // Reka's DialogRoot renders no element and drops attributes, as Radix's Root does, so its
  // data-slot is there for parity with the React file only. The portal gets none: neither library
  // renders one for it.
  const root = file(
    "Dialog",
    `import type { DialogRootEmits, DialogRootProps } from "reka-ui";
import { DialogRoot, useForwardPropsEmits } from "reka-ui";

const props = defineProps<DialogRootProps>();
const emits = defineEmits<DialogRootEmits>();
const forwarded = useForwardPropsEmits(props, emits);`,
    `<DialogRoot v-slot="slotProps" data-slot="dialog" v-bind="forwarded">
  <slot v-bind="slotProps" />
</DialogRoot>`,
  );

  const overlay = file(
    "DialogOverlay",
    `import type { DialogOverlayProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DialogOverlay } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes["class"] }>();
const delegatedProps = reactiveOmit(props, "class");`,
    `<DialogOverlay data-slot="dialog-overlay" v-bind="delegatedProps" :class="cn(${classArg(c.backdrop)}, props.class)">
  <slot />
</DialogOverlay>`,
  );

  // The content brings its own portal and overlay, and a close button unless showCloseButton is false.
  const content = file(
    "DialogContent",
    `import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { XIcon } from "${LUCIDE_PACKAGES.vue}";
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import DialogOverlay from "./DialogOverlay.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<DialogContentProps & { class?: HTMLAttributes["class"]; showCloseButton?: boolean }>(), { showCloseButton: true });
const emits = defineEmits<DialogContentEmits>();
const delegatedProps = reactiveOmit(props, "class", "showCloseButton");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<DialogPortal>
  <DialogOverlay />
  <DialogContent data-slot="dialog-content" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classArg(c.popup!)}, props.class)">
    <slot />
    <DialogClose v-if="showCloseButton" data-slot="dialog-close" ${staticClass(c.close)}>
      <XIcon aria-hidden="true" />
      <span class="sr-only">Close</span>
    </DialogClose>
  </DialogContent>
</DialogPortal>`,
  );

  // Header and footer are plain elements: only a class prop.
  const block = (name: string, slot: string, classes: string, close: boolean) =>
    file(
      name,
      `import type { HTMLAttributes } from "vue";
${close ? `import { DialogClose } from "reka-ui";\n` : ""}import { cn } from "@/lib/utils";

const props = ${close ? `withDefaults(defineProps<{ class?: HTMLAttributes["class"]; showCloseButton?: boolean }>(), { showCloseButton: false })` : `defineProps<{ class?: HTMLAttributes["class"] }>()`};`,
      `<div data-slot="${slot}" :class="cn(${classArg(classes)}, props.class)">
  <slot />${close ? `\n  <DialogClose v-if="showCloseButton">Close</DialogClose>` : ""}
</div>`,
    );

  return [
    root,
    passthrough("DialogTrigger", "dialog-trigger"),
    passthrough("DialogPortal", null),
    passthrough("DialogClose", "dialog-close"),
    overlay,
    content,
    block("DialogHeader", "dialog-header", c.header, false),
    block("DialogFooter", "dialog-footer", c.footer, true),
    styled("DialogTitle", "dialog-title", c.title),
    styled("DialogDescription", "dialog-description", c.description),
    { path: "dialog/index.ts", source: `${partExports(PARTS)}\n` },
  ];
}
