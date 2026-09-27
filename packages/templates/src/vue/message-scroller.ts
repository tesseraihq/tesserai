import type { Anatomy } from "@tesserai/core";
import { messageScrollerPieces } from "../chat";
import { MESSAGE_SCROLLER_ENGINE } from "../chat-engines";
import { q } from "../codegen";
import type { GeneratedFile } from "../render";
import { barrel, classList, folder } from "./sfc";

// The message scroller, as shadcn-vue ports it: no Vue package has one, so its behaviour is a
// module in the folder (engine.ts, the same one the Svelte folder gets), provided to the parts by
// MessageScrollerProvider. The parts hand it their elements through function refs (set before any
// part is mounted, as React's refs are) and re-render when it says something changed. They write
// what @shadcn/react's parts write: data-pending-scroll until the conversation is placed,
// data-scrollable and data-autoscrolling as it scrolls, data-active on the jump buttons.

export function renderMessageScroller(anatomy: Anatomy): GeneratedFile[] {
  const { slots, button } = messageScrollerPieces(anatomy);
  const f = folder("message-scroller");
  const context: GeneratedFile = {
    path: "message-scroller/useMessageScroller.ts",
    source: `import type { InjectionKey, Ref } from "vue";
import type { MessageScrollerProviderProps, MessageScrollerScrollable, MessageScrollerVisibilityState } from "./engine";
import { computed, getCurrentScope, inject, onMounted, onScopeDispose, provide, shallowRef, watch } from "vue";
import { MessageScrollerEngine } from "./engine";

type MessageScrollerContext = { engine: MessageScrollerEngine; version: Ref<number> };
const KEY: InjectionKey<MessageScrollerContext> = Symbol("MessageScroller");

// The provider's engine, for its parts; version counts its changes, so a computed that reads it
// re-reads the engine.
export function provideMessageScroller(props: MessageScrollerProviderProps) {
  const engine = new MessageScrollerEngine(() => props);
  const version = shallowRef(0);
  engine.change = () => {
    version.value += 1;
  };
  provide(KEY, { engine, version });
  watch([() => props.autoScroll, () => props.defaultScrollPosition], engine.update);
  onMounted(engine.mounted);
  onScopeDispose(engine.destroy);
}

export function injectMessageScroller(): MessageScrollerContext {
  const context = inject(KEY, null);
  if (context === null) throw new Error("MessageScroller's parts must be used within a <MessageScrollerProvider />");
  return context;
}

// A value read from the engine, kept current.
export function useMessageScrollerState<T>(read: (engine: MessageScrollerEngine) => T) {
  const { engine, version } = injectMessageScroller();
  return computed(() => {
    void version.value;
    return read(engine);
  });
}

// Scroll the conversation from anywhere inside it.
export function useMessageScroller() {
  const { engine } = injectMessageScroller();
  return { scrollToEnd: engine.scrollToEnd, scrollToMessage: engine.scrollToMessage, scrollToStart: engine.scrollToStart };
}

// Whether there's more above and below the viewport.
export function useMessageScrollerScrollable(): Readonly<Ref<MessageScrollerScrollable>> {
  return useMessageScrollerState((engine) => engine.scrollable);
}

// The messages in view (by messageId) and the anchored one at the top; measured only while
// something reads them.
export function useMessageScrollerVisibility(): Readonly<Ref<MessageScrollerVisibilityState>> {
  const { engine } = injectMessageScroller();
  engine.acquireVisibility();
  if (getCurrentScope()) onScopeDispose(engine.releaseVisibility);
  return useMessageScrollerState((e) => e.visibility);
}
`,
  };
  const element = `(element: unknown) => (element instanceof HTMLElement ? element : null)`;
  const provider = f.file(
    "MessageScrollerProvider",
    `import type { MessageScrollerProviderProps } from "./engine";
import { provideMessageScroller } from "./useMessageScroller";

// autoScroll follows new messages while you're at the bottom; defaultScrollPosition is where the
// conversation opens.
const props = withDefaults(defineProps<MessageScrollerProviderProps>(), { autoScroll: false, defaultScrollPosition: "end" });
provideMessageScroller(props);`,
    `<slot />`,
  );
  const root = f.file(
    "MessageScroller",
    `import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { injectMessageScroller, useMessageScrollerState } from "./useMessageScroller";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
const { engine } = injectMessageScroller();
const pending = useMessageScrollerState((e) => e.pendingScroll);
const asElement = ${element};
const setRoot = (element: unknown) => engine.setRoot(asElement(element));`,
    `<div :ref="setRoot" data-slot="message-scroller" :data-pending-scroll="pending ? '' : undefined" :class="cn(${classList(slots["message-scroller"])}, props.class)">
  <slot />
</div>`,
  );
  const viewport = f.file(
    "MessageScrollerViewport",
    `import type { HTMLAttributes } from "vue";
import { onBeforeUnmount, onMounted, watchEffect } from "vue";
import { cn } from "@/lib/utils";
import { observeResize, SCROLL_KEYS } from "./engine";
import { injectMessageScroller, useMessageScrollerState } from "./useMessageScroller";

// preserveScrollOnPrepend keeps you with the messages you're reading when older ones load above.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; preserveScrollOnPrepend?: boolean }>(), { preserveScrollOnPrepend: true });
const { engine } = injectMessageScroller();
const pending = useMessageScrollerState((e) => e.pendingScroll);
watchEffect(() => {
  engine.preserveScrollOnPrepend = props.preserveScrollOnPrepend;
});

const asElement = ${element};
let viewport: HTMLElement | null = null;
const setViewport = (element: unknown) => {
  viewport = asElement(element);
  engine.setViewport(viewport);
};
let stop = () => {};
onMounted(() => {
  if (viewport !== null) stop = observeResize(viewport, engine.handleResize);
});
onBeforeUnmount(() => stop());

// A key that scrolls, a wheel or a touch is the reader taking over.
function onKeydown(event: KeyboardEvent) {
  if (SCROLL_KEYS.has(event.key)) engine.userScrollIntent();
}`,
    `<div
  :ref="setViewport"
  data-slot="message-scroller-viewport"
  role="region"
  aria-label="Messages"
  tabindex="0"
  :data-pending-scroll="pending ? '' : undefined"
  :class="cn(${classList(slots["message-scroller-viewport"])}, props.class)"
  @scroll="engine.syncAfterScroll"
  @wheel.passive="engine.userScrollIntent"
  @touchmove.passive="engine.userScrollIntent"
  @keydown="onKeydown"
>
  <slot />
</div>`,
  );
  const content = f.file(
    "MessageScrollerContent",
    `import type { HTMLAttributes } from "vue";
import { onBeforeUnmount, onMounted } from "vue";
import { cn } from "@/lib/utils";
import { observeChildren, observeResize } from "./engine";
import { injectMessageScroller } from "./useMessageScroller";

// spacerClass styles the space after the last message that lets an anchored one reach the top.
const props = defineProps<{ class?: HTMLAttributes["class"]; spacerClass?: HTMLAttributes["class"] }>();
const { engine } = injectMessageScroller();

const asElement = ${element};
let content: HTMLElement | null = null;
const setContent = (element: unknown) => {
  content = asElement(element);
  engine.setContent(content);
};
const setSpacer = (element: unknown) => engine.setSpacer(asElement(element));
const stops: (() => void)[] = [];
onMounted(() => {
  if (content === null) return;
  engine.handleContentChange();
  stops.push(observeChildren(content, engine.handleContentChange), observeResize(content, engine.handleResize));
});
onBeforeUnmount(() => {
  for (const stop of stops) stop();
});`,
    `<div :ref="setContent" data-slot="message-scroller-content" role="log" aria-relevant="additions" :class="cn(${classList(slots["message-scroller-content"])}, props.class)">
  <slot />
  <div :ref="setSpacer" aria-hidden="true" data-message-scroller-spacer="" hidden :class="spacerClass" />
</div>`,
  );
  const item = f.file(
    "MessageScrollerItem",
    `import type { HTMLAttributes } from "vue";
import { watch } from "vue";
import { cn } from "@/lib/utils";
import { injectMessageScroller } from "./useMessageScroller";

// messageId makes the item a target for scrollToMessage and visibility; scrollAnchor keeps it in
// view as newer ones arrive.
const props = withDefaults(defineProps<{ class?: HTMLAttributes["class"]; messageId?: string; scrollAnchor?: boolean }>(), { messageId: undefined, scrollAnchor: false });
const { engine } = injectMessageScroller();

let item: HTMLElement | null = null;
const setItem = (element: unknown) => {
  const previous = item;
  item = element instanceof HTMLElement ? element : null;
  if (props.messageId) engine.registerMessage(props.messageId, item, previous);
};
watch(
  () => props.messageId,
  (id, previous) => {
    if (item === null) return;
    if (previous) engine.registerMessage(previous, null, item);
    if (id) engine.registerMessage(id, item, null);
  },
);`,
    `<div
  :ref="setItem"
  data-slot="message-scroller-item"
  :data-message-id="messageId"
  :data-scroll-anchor="scrollAnchor ? 'true' : 'false'"
  :class="cn(${classList(slots["message-scroller-item"])}, props.class)"
>
  <slot />
</div>`,
  );
  const jump = f.file(
    "MessageScrollerButton",
    `import type { HTMLAttributes } from "vue";
import type { ButtonVariantProps } from "@/components/ui/button";
import type { MessageScrollerButtonDirection } from "./engine";
import { ArrowDownIcon } from "@lucide/vue";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { injectMessageScroller, useMessageScrollerState } from "./useMessageScroller";

// Appears when you have scrolled away from the newest (or, direction="start", the oldest) message.
const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes["class"];
    direction?: MessageScrollerButtonDirection;
    behavior?: ScrollBehavior;
    variant?: ButtonVariantProps["variant"];
    size?: ButtonVariantProps["size"];
    tabindex?: number;
  }>(),
  { direction: "end", behavior: "smooth", variant: ${q(button.variant)}, size: ${q(button.size)}, tabindex: undefined },
);
const emits = defineEmits<{ click: [event: MouseEvent] }>();
const { engine } = injectMessageScroller();
const active = useMessageScrollerState((e) => (props.direction === "start" ? e.scrollable.start : e.scrollable.end));

// Your click handler runs first, and can keep the jump from happening (preventDefault).
function onClick(event: MouseEvent) {
  if (!active.value) return;
  emits("click", event);
  if (event.defaultPrevented) return;
  (event.currentTarget as HTMLElement | null)?.blur();
  if (props.direction === "start") engine.scrollToStart({ behavior: props.behavior });
  else engine.scrollToEnd({ behavior: props.behavior });
}`,
    `<Button
  data-slot="message-scroller-button"
  :data-direction="direction"
  :data-active="active ? 'true' : 'false'"
  :variant="variant"
  :size="size"
  type="button"
  :inert="!active"
  :tabindex="active ? tabindex : -1"
  :class="cn(${classList(slots["message-scroller-button"])}, props.class)"
  @click="onClick"
>
  <slot>
    <ArrowDownIcon />
    <span class="sr-only">{{ direction === "end" ? "Scroll to end" : "Scroll to start" }}</span>
  </slot>
</Button>`,
  );
  const index = `export type {
  MessageScrollerButtonDirection,
  MessageScrollerDefaultScrollPosition,
  MessageScrollerProviderProps,
  MessageScrollerScrollable,
  MessageScrollerScrollAlign,
  MessageScrollerScrollOptions,
  MessageScrollerVisibilityState,
} from "./engine";
export { useMessageScroller, useMessageScrollerScrollable, useMessageScrollerVisibility } from "./useMessageScroller";`;
  return [
    { path: "message-scroller/engine.ts", source: MESSAGE_SCROLLER_ENGINE },
    context,
    provider,
    root,
    viewport,
    content,
    item,
    jump,
    barrel("message-scroller", ["MessageScroller", "MessageScrollerButton", "MessageScrollerContent", "MessageScrollerItem", "MessageScrollerProvider", "MessageScrollerViewport"], index),
  ];
}
