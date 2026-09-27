import type { Anatomy } from "@tesserai/core";
import { cvaSource, q, unionType } from "../codegen";
import { ROOT_EXTRA, toastSlotPieces } from "../radix/toast";
import { lucideName, type GeneratedFile, type TemplateContext } from "../render";
import { lucideImport, quoted, svelteFile, UTILS_IMPORT } from "./emit";
import { BITS_STATES } from "./states";

// The swipe's distance, which the toast sets itself (Radix calls it --radix-toast-swipe-move-x).
export const TOAST_SWIPE_VAR = "--toast-swipe-move-x";

// Toast for Svelte: Bits has no toast, and svelte-sonner (which Sonner here uses) draws and moves
// its own; so this is a port of the Radix toast the React file uses, with its surface: toast.add()
// from anywhere, <Toaster /> once near the root, useToastManager(). A toast opens and closes with
// data-state (its exit animation runs before it goes), closes on its own after its timeout (paused
// while hovered, focused or the window is away), and swipes away to the right with data-swipe.
export function toastFiles(anatomy: Anatomy, context: TemplateContext): GeneratedFile[] {
  const motion = ROOT_EXTRA.map((c) => c.replace("--radix-toast-swipe-move-x", TOAST_SWIPE_VAR));
  const { slots, intents, defaultIntent, icons } = toastSlotPieces(anatomy, context, { states: BITS_STATES, motion });
  const iconNames = [...new Set(icons.map(([, name]) => lucideName(name)))];

  const store = `// toast.add({ title, description, type: "success", actionProps: { children: "Undo", onClick } })
// from anywhere; <Toaster /> shows them.
export type ToastOptions = {
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  // Milliseconds before it closes on its own (5000 unless given); Infinity keeps it open.
  timeout?: number;
  actionProps?: { children: string; onClick?: () => void; altText?: string };
};
export type ToastItem = ToastOptions & { id: string };

let items = $state<ToastItem[]>([]);
let counter = 0;

export const toast = {
  add(options: ToastOptions): string {
    const id = options.id ?? String(++counter);
    items = [...items.filter((t) => t.id !== id), { ...options, id }];
    return id;
  },
  close(id: string) {
    items = items.filter((t) => t.id !== id);
  },
};

export function useToastManager() {
  return {
    get toasts(): readonly ToastItem[] {
      return items;
    },
    add: toast.add,
    close: toast.close,
  };
}
`;

  const item = svelteFile("toast/toast-item.svelte", {
    module: `import { cva, type VariantProps } from "class-variance-authority";

export ${cvaSource("toastVariants", slots.toast)}
export ${cvaSource("toastIconVariants", slots["toast-icon"])}

export type ToastVariants = VariantProps<typeof toastVariants>;
export type ToastIntent = ${unionType(intents)};
const INTENTS: readonly ToastIntent[] = [${intents.map(q).join(", ")}];

// A toast's type names its intent; anything else is ${defaultIntent}.
export function intentOf(type: string | undefined): ToastIntent {
  return INTENTS.find((intent) => intent === type) ?? ${q(defaultIntent)};
}`,
    script: `${["XIcon", ...iconNames].sort().map(lucideImport).join("\n")}
import { onMount, tick } from "svelte";
import { toast, type ToastItem } from "./toast.svelte.js";

const contentClasses = ${quoted(slots["toast-content"])};
const titleClasses = ${quoted(slots["toast-title"])};
const descriptionClasses = ${quoted(slots["toast-description"])};
const actionClasses = ${quoted(slots["toast-action"])};
const closeClasses = ${quoted(slots["toast-close"])};

let { item }: { item: ToastItem } = $props();

const intent = $derived(intentOf(item.type));

let element: HTMLLIElement | null = $state(null);
let open = $state(true);
let swipe: "move" | "cancel" | "end" | undefined = $state();
let moveX = $state(0);

// Closes with its exit animation, then leaves the list.
async function close() {
  if (!open) return;
  open = false;
  await tick();
  const animations = element?.getAnimations() ?? [];
  await Promise.allSettled(animations.map((a) => a.finished));
  toast.close(item.id);
}

// The timeout, paused while the toast is hovered or focused, or the window is away.
let remaining = 0;
let started = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const pause = () => {
  if (timer === undefined) return;
  clearTimeout(timer);
  timer = undefined;
  remaining -= Date.now() - started;
};
const resume = () => {
  if (timer !== undefined || !open || remaining === Infinity) return;
  started = Date.now();
  timer = setTimeout(close, Math.max(remaining, 0));
};
onMount(() => {
  remaining = item.timeout ?? 5000;
  resume();
  return () => clearTimeout(timer);
});

// Swiped right past a threshold, it goes; short of it, it springs back.
let startX: number | null = null;
function onpointerdown(event: PointerEvent) {
  if (event.button !== 0) return;
  startX = event.clientX;
}
function onpointermove(event: PointerEvent) {
  if (startX === null) return;
  const x = Math.max(0, event.clientX - startX);
  if (x === 0 && swipe === undefined) return;
  swipe = "move";
  moveX = x;
  element?.setPointerCapture(event.pointerId);
}
function onpointerup() {
  if (startX === null) return;
  startX = null;
  if (swipe !== "move") return;
  if (moveX > 50) {
    swipe = "end";
    void close();
  } else {
    swipe = "cancel";
    moveX = 0;
  }
}`,
    markup: `<svelte:window onblur={pause} onfocus={resume} />

<!-- A focusable status, as Radix's toast is: the keyboard reaches it (F8, then Tab) to pause it or
     dismiss it with Escape, and a pointer swipes it away. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<li
  bind:this={element}
  role="status"
  aria-live="off"
  aria-atomic="true"
  tabindex="0"
  data-slot="toast"
  data-intent={intent}
  data-state={open ? "open" : "closed"}
  data-swipe={swipe}
  data-swipe-direction="right"
  style:${TOAST_SWIPE_VAR}={\`\${moveX}px\`}
  class={toastVariants({ intent })}
  onpointerenter={pause}
  onpointerleave={resume}
  onfocusin={pause}
  onfocusout={resume}
  {onpointerdown}
  {onpointermove}
  {onpointerup}
  onpointercancel={onpointerup}
  onkeydown={(event) => {
    if (event.key === "Escape") void close();
  }}
>
  <span data-slot="toast-icon" class={toastIconVariants({ intent })}>
${icons.length === 0 ? "" : `${icons.map(([intent, name], i) => `    {${i === 0 ? "#if" : ":else if"} intent === ${q(intent)}}\n      <${lucideName(name)} aria-hidden="true" />`).join("\n")}\n    {/if}`}
  </span>
  <div data-slot="toast-content" class={contentClasses}>
    {#if item.title !== undefined}
      <div data-slot="toast-title" class={titleClasses}>{item.title}</div>
    {/if}
    {#if item.description !== undefined}
      <div data-slot="toast-description" class={descriptionClasses}>{item.description}</div>
    {/if}
  </div>
  {#if item.actionProps}
    <button
      type="button"
      data-slot="toast-action"
      aria-label={item.actionProps.altText}
      class={actionClasses}
      onclick={() => {
        item.actionProps?.onClick?.();
        void close();
      }}
    >
      {item.actionProps.children}
    </button>
  {:else}
    <span></span>
  {/if}
  <button type="button" data-slot="toast-close" aria-label="Close" class={closeClasses} onclick={() => void close()}>
    <XIcon aria-hidden="true" />
  </button>
</li>`,
  });

  // The toasts' region: F8 takes the keyboard to it, as Radix's does.
  const toaster = svelteFile("toast/toaster.svelte", {
    script: `import type { Snippet } from "svelte";
${UTILS_IMPORT(["cn"])}
import ToastItem from "./toast-item.svelte";
import { useToastManager } from "./toast.svelte.js";

const classes = ${quoted(slots["toast-viewport"])};
const announcerClasses = "sr-only";

// Mount once near the root; it may wrap the app.
let { class: className, children }: { class?: string; children?: Snippet } = $props();

const manager = useToastManager();
let viewport: HTMLOListElement | null = $state(null);`,
    markup: `<svelte:window
  onkeydown={(event) => {
    if (event.key === "F8") viewport?.focus();
  }}
/>

{@render children?.()}
<section aria-label="Notifications (F8)" tabindex="-1" style:pointer-events={manager.toasts.length > 0 ? undefined : "none"}>
  <!-- Mounted before notifications arrive, so additions announce without moving focus.
       Keep interactive controls out of the announcement and ignore removals. -->
  <div data-slot="toast-announcer" class={announcerClasses} aria-live="polite" aria-relevant="additions text">
    {#each manager.toasts as item (item.id)}
      <div aria-atomic="true">{[item.title, item.description, item.actionProps?.altText ?? item.actionProps?.children].filter(Boolean).join(". ")}</div>
    {/each}
  </div>
  <ol bind:this={viewport} tabindex="-1" data-slot="toast-viewport" class={cn(classes, className)}>
    {#each manager.toasts as item (item.id)}
      <ToastItem {item} />
    {/each}
  </ol>
</section>`,
  });

  return [
    { path: "toast/toast.svelte.ts", source: store },
    item,
    toaster,
    {
      path: "toast/index.ts",
      source: `import Root from "./toaster.svelte";

export { intentOf, toastIconVariants, toastVariants, type ToastIntent, type ToastVariants } from "./toast-item.svelte";
export { toast, useToastManager, type ToastOptions } from "./toast.svelte.js";

export {
  Root,
  //
  Root as Toaster,
};
`,
    },
  ];
}
