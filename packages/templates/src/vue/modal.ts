import type { Anatomy } from "@tesserai/core";
import { LUCIDE_PACKAGES } from "../icons";
import { modalClasses } from "../modal";
import type { GeneratedFile } from "../render";
import { rekaVars } from "./states";
import { barrel, classArg, folder, passthrough, plain, staticClass, styled } from "./sfc";

// Alert Dialog and Sheet on Reka's AlertDialog and Dialog parts, with modalClasses' Radix output:
// Reka marks open and closed with the same data-state. Portals carry no data-slot: neither library
// renders an element for them.

export function renderAlertDialog(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "alert-dialog", "radix");
  const f = folder("alert-dialog");

  const content = f.file(
    "AlertDialogContent",
    `import type { AlertDialogContentEmits, AlertDialogContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialogContent, AlertDialogPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import { alertDialogContentVariants } from ".";
import AlertDialogOverlay from "./AlertDialogOverlay.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<AlertDialogContentProps & { class?: HTMLAttributes["class"]; size?: ${c.sizes} }>(), { size: ${c.defaultSize} });
const emits = defineEmits<AlertDialogContentEmits>();
const delegatedProps = reactiveOmit(props, "class", "size");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<AlertDialogPortal>
  <AlertDialogOverlay />
  <AlertDialogContent data-slot="alert-dialog-content" :data-size="size" v-bind="{ ...$attrs, ...forwarded }" :class="cn(alertDialogContentVariants({ size }), props.class)">
    <slot />
  </AlertDialogContent>
</AlertDialogPortal>`,
  );

  // Action and Cancel close the dialog; they render as the system's Button (as-child).
  const button = (name: "Action" | "Cancel") =>
    f.file(
      `AlertDialog${name}`,
      `import type { AlertDialog${name}Props } from "reka-ui";
import type { ButtonVariantProps } from "@/components/ui/button";
import { reactiveOmit } from "@vueuse/core";
import { AlertDialog${name} } from "reka-ui";
import { Button } from "@/components/ui/button";

const props = ${
        name === "Action"
          ? `defineProps<AlertDialog${name}Props & { variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"]; intent?: ButtonVariantProps["intent"] }>()`
          : `withDefaults(defineProps<AlertDialog${name}Props & { variant?: ButtonVariantProps["variant"]; size?: ButtonVariantProps["size"] }>(), { variant: "outline" })`
      };
const delegatedProps = reactiveOmit(props, "variant", "size"${name === "Action" ? `, "intent"` : ""});`,
      `<Button as-child :variant="variant" :size="size"${name === "Action" ? ` :intent="intent"` : ""}>
  <AlertDialog${name} data-slot="alert-dialog-${name.toLowerCase()}" v-bind="delegatedProps">
    <slot />
  </AlertDialog${name}>
</Button>`,
    );

  const popupCva = `export ${rekaVars(c.popupCva!)}`;
  return [
    passthrough(f, "AlertDialog", "AlertDialogRoot", "alert-dialog", { emits: true, slotProps: true, types: "AlertDialog" }),
    passthrough(f, "AlertDialogTrigger", "AlertDialogTrigger", "alert-dialog-trigger"),
    passthrough(f, "AlertDialogPortal", "AlertDialogPortal", null),
    styled(f, "AlertDialogOverlay", "AlertDialogOverlay", "alert-dialog-overlay", classArg(c.backdrop)),
    content,
    plain(f, "AlertDialogHeader", "div", "alert-dialog-header", classArg(c.header)),
    plain(f, "AlertDialogFooter", "div", "alert-dialog-footer", classArg(c.footer)),
    plain(f, "AlertDialogMedia", "div", "alert-dialog-media", classArg(c.media)),
    styled(f, "AlertDialogTitle", "AlertDialogTitle", "alert-dialog-title", classArg(c.title)),
    styled(f, "AlertDialogDescription", "AlertDialogDescription", "alert-dialog-description", classArg(c.description)),
    button("Action"),
    button("Cancel"),
    barrel(
      "alert-dialog",
      [
        "AlertDialog",
        "AlertDialogAction",
        "AlertDialogCancel",
        "AlertDialogContent",
        "AlertDialogDescription",
        "AlertDialogFooter",
        "AlertDialogHeader",
        "AlertDialogMedia",
        "AlertDialogOverlay",
        "AlertDialogPortal",
        "AlertDialogTitle",
        "AlertDialogTrigger",
      ],
      `import { cva } from "class-variance-authority";\n\n${popupCva}`,
    ),
  ];
}

// A dialog on one side of the screen, sliding in from it: side="right" by default.
export function renderSheet(anatomy: Anatomy): GeneratedFile[] {
  const c = modalClasses(anatomy, "sheet", "radix");
  const f = folder("sheet");
  const content = f.file(
    "SheetContent",
    `import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { XIcon } from "${LUCIDE_PACKAGES.vue}";
import { reactiveOmit } from "@vueuse/core";
import { DialogClose, DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import SheetOverlay from "./SheetOverlay.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<DialogContentProps & { class?: HTMLAttributes["class"]; side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean }>(),
  { side: "right", showCloseButton: true },
);
const emits = defineEmits<DialogContentEmits>();
const delegatedProps = reactiveOmit(props, "class", "side", "showCloseButton");
const forwarded = useForwardPropsEmits(delegatedProps, emits);`,
    `<DialogPortal>
  <SheetOverlay />
  <DialogContent data-slot="sheet-content" :data-side="side" v-bind="{ ...$attrs, ...forwarded }" :class="cn(${classArg(c.popup!)}, props.class)">
    <slot />
    <DialogClose v-if="showCloseButton" data-slot="sheet-close" ${staticClass(c.close)}>
      <XIcon aria-hidden="true" />
      <span class="sr-only">Close</span>
    </DialogClose>
  </DialogContent>
</DialogPortal>`,
  );
  return [
    passthrough(f, "Sheet", "DialogRoot", "sheet", { emits: true, slotProps: true }),
    passthrough(f, "SheetTrigger", "DialogTrigger", "sheet-trigger"),
    passthrough(f, "SheetClose", "DialogClose", "sheet-close"),
    styled(f, "SheetOverlay", "DialogOverlay", "sheet-overlay", classArg(c.backdrop)),
    content,
    plain(f, "SheetHeader", "div", "sheet-header", classArg(c.header)),
    plain(f, "SheetFooter", "div", "sheet-footer", classArg(c.footer)),
    styled(f, "SheetTitle", "DialogTitle", "sheet-title", classArg(c.title)),
    styled(f, "SheetDescription", "DialogDescription", "sheet-description", classArg(c.description)),
    // SheetOverlay is SheetContent's own, and not exported, as in shadcn-vue and the React file.
    barrel("sheet", ["Sheet", "SheetClose", "SheetContent", "SheetDescription", "SheetFooter", "SheetHeader", "SheetTitle", "SheetTrigger"]),
  ];
}
