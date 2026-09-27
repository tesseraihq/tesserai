import type { Anatomy } from "@tesserai/core";
import { cvaSource, q, unionType } from "../codegen";
import { LUCIDE_PACKAGES } from "../icons";
import { toastSlotPieces } from "../radix/toast";
import { lucideName, type GeneratedFile, type TemplateContext } from "../render";
import { rekaVars } from "./states";
import { barrel, classList, folder, staticClasses } from "./sfc";

// Toast on Reka's Toast parts, which are Radix's (data-state to open and close, data-swipe and
// --reka-toast-swipe-move-x to swipe away), with the React file's surface: toast.add() from
// anywhere, <Toaster /> once near the root, useToastManager(). The toasts are a reactive list in
// index.ts; each type names an intent, with its icon so meaning never relies on color alone.
export function renderToast(anatomy: Anatomy, context: TemplateContext): GeneratedFile[] {
  const { slots, intents, defaultIntent, icons } = toastSlotPieces(anatomy, context);
  const f = folder("toast");
  const iconNames = [...new Set(icons.map(([, name]) => lucideName(name)))];

  const toaster = f.file(
    "Toaster",
    `import type { Component, HTMLAttributes } from "vue";
import { ${["XIcon", ...iconNames].sort().join(", ")} } from "${LUCIDE_PACKAGES.vue}";
import { ToastAction, ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from "reka-ui";
import { computed } from "vue";
import { cn } from "@/lib/utils";
import { intentOf, toastIconVariants, toastVariants, useToastManager, type ToastIntent } from ".";

// Mount once near the root; it may wrap the app.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const { toasts, close } = useToastManager();
// Each toast with the intent its type names.
const shown = computed(() => toasts.value.map((item) => ({ ...item, intent: intentOf(item.type) })));

const icons: Partial<Record<ToastIntent, Component>> = {
${icons.map(([intent, name]) => `  ${q(intent)}: ${lucideName(name)},`).join("\n")}
};`,
    `<ToastProvider swipe-direction="right">
  <slot />
  <ToastRoot
    v-for="item in shown"
    :key="item.id"
    data-slot="toast"
    :data-intent="item.intent"
    :duration="item.timeout"
    :class="toastVariants({ intent: item.intent })"
    @update:open="(open) => (open ? undefined : close(item.id))"
  >
    <span data-slot="toast-icon" :class="toastIconVariants({ intent: item.intent })">
      <component :is="icons[item.intent]" v-if="icons[item.intent]" aria-hidden="true" />
    </span>
    <div data-slot="toast-content" ${staticClasses(slots["toast-content"])}>
      <ToastTitle v-if="item.title !== undefined" data-slot="toast-title" ${staticClasses(slots["toast-title"])}>{{ item.title }}</ToastTitle>
      <ToastDescription v-if="item.description !== undefined" data-slot="toast-description" ${staticClasses(slots["toast-description"])}>{{ item.description }}</ToastDescription>
    </div>
    <ToastAction
      v-if="item.actionProps"
      data-slot="toast-action"
      :alt-text="item.actionProps.altText ?? item.actionProps.children"
      ${staticClasses(slots["toast-action"])}
      @click="item.actionProps.onClick?.()"
    >
      {{ item.actionProps.children }}
    </ToastAction>
    <span v-else />
    <ToastClose data-slot="toast-close" aria-label="Close" ${staticClasses(slots["toast-close"])}>
      <XIcon aria-hidden="true" />
    </ToastClose>
  </ToastRoot>
  <ToastViewport data-slot="toast-viewport" :class="cn(${classList(slots["toast-viewport"])}, props.class)" />
</ToastProvider>`,
  );

  const store = `import { cva, type VariantProps } from "class-variance-authority";
import { readonly, ref } from "vue";

export ${rekaVars(cvaSource("toastVariants", slots.toast))}
export ${rekaVars(cvaSource("toastIconVariants", slots["toast-icon"]))}

export type ToastVariants = VariantProps<typeof toastVariants>;
export type ToastIntent = ${unionType(intents)};
const INTENTS: readonly ToastIntent[] = [${intents.map(q).join(", ")}];

// A toast's type names its intent; anything else is ${defaultIntent}.
export function intentOf(type: string | undefined): ToastIntent {
  return INTENTS.find((intent) => intent === type) ?? ${q(defaultIntent)};
}

export type ToastOptions = {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  // Milliseconds before it closes on its own.
  timeout?: number;
  actionProps?: { children: string; onClick?: () => void; altText?: string };
};
type ToastItem = ToastOptions & { id: string };

const items = ref<ToastItem[]>([]);
let counter = 0;

// toast.add({ title, description, type: "success", actionProps: { children: "Undo", onClick } })
// from anywhere; <Toaster /> shows them.
export const toast = {
  add(options: ToastOptions): string {
    const id = options.id ?? String(++counter);
    items.value = [...items.value.filter((t) => t.id !== id), { ...options, id }];
    return id;
  },
  close(id: string) {
    items.value = items.value.filter((t) => t.id !== id);
  },
};

export function useToastManager() {
  return { toasts: readonly(items), add: toast.add, close: toast.close };
}`;

  return [toaster, barrel("toast", ["Toaster"], store)];
}
