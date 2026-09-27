import type { Anatomy } from "@tesserai/core";
import { messageScrollerPieces } from "../chat";
import { MESSAGE_SCROLLER_ENGINE } from "../chat-engines";
import { q } from "../codegen";
import type { GeneratedFile } from "../render";
import { indexFile, indexParts, lucideImport, quoted, svelteFile, uiImport, UTILS_IMPORT } from "./emit";

// The message scroller, as shadcn-svelte ports it: no Svelte package has one, so its behaviour is a
// module in the folder (engine.ts, the same one the Vue folder gets), which the provider sets as
// context (context.svelte.ts). The parts hand it their elements from effects (untracked, so the
// engine's own reads don't re-run them) and re-read it when it says something changed. They write
// what @shadcn/react's parts write: data-pending-scroll until the conversation is placed,
// data-scrollable and data-autoscrolling as it scrolls, data-active on the jump buttons.

const DIV = `import type { HTMLAttributes } from "svelte/elements";`;

export function messageScrollerFiles(anatomy: Anatomy): GeneratedFile[] {
  const { slots, button } = messageScrollerPieces(anatomy);
  const context: GeneratedFile = {
    path: "message-scroller/context.svelte.ts",
    source: `import { getContext, hasContext, setContext } from "svelte";
import { MessageScrollerEngine, type MessageScrollerProviderProps, type MessageScrollerScrollable, type MessageScrollerVisibilityState } from "./engine.js";

const MESSAGE_SCROLLER = Symbol("MESSAGE_SCROLLER");

// Counts the engine's changes: reading it in a $derived makes the derived re-read the engine.
class Changes {
  count = $state(0);
}

export type MessageScrollerContext = { engine: MessageScrollerEngine; read: <T>(f: (engine: MessageScrollerEngine) => T) => T };

export function setMessageScroller(props: () => MessageScrollerProviderProps): MessageScrollerContext {
  const engine = new MessageScrollerEngine(props);
  const changes = new Changes();
  engine.change = () => {
    changes.count += 1;
  };
  const context: MessageScrollerContext = {
    engine,
    read: (f) => {
      void changes.count;
      return f(engine);
    },
  };
  return setContext(MESSAGE_SCROLLER, context);
}

export function getMessageScroller(name = "This component"): MessageScrollerContext {
  if (!hasContext(MESSAGE_SCROLLER)) throw new Error(\`\${name} must be used within a <MessageScroller.Provider>\`);
  return getContext<MessageScrollerContext>(MESSAGE_SCROLLER);
}

// Scroll the conversation from anywhere inside it.
export function useMessageScroller() {
  const { engine } = getMessageScroller("useMessageScroller");
  return { scrollToEnd: engine.scrollToEnd, scrollToMessage: engine.scrollToMessage, scrollToStart: engine.scrollToStart };
}

// Whether there's more above and below the viewport, as .current.
export function useMessageScrollerScrollable(): { readonly current: MessageScrollerScrollable } {
  const { read } = getMessageScroller("useMessageScrollerScrollable");
  return {
    get current() {
      return read((engine) => engine.scrollable);
    },
  };
}

// The messages in view (by messageId) and the anchored one at the top, as .current; measured only
// while a component reading them is mounted.
export function useMessageScrollerVisibility(): { readonly current: MessageScrollerVisibilityState } {
  const { engine, read } = getMessageScroller("useMessageScrollerVisibility");
  $effect(() => {
    engine.acquireVisibility();
    return engine.releaseVisibility;
  });
  return {
    get current() {
      return read((e) => e.visibility);
    },
  };
}
`,
  };
  const provider = svelteFile("message-scroller/message-scroller-provider.svelte", {
    script: `import type { Snippet } from "svelte";
import { onMount, untrack } from "svelte";
import type { MessageScrollerProviderProps } from "./engine.js";
import { setMessageScroller } from "./context.svelte.js";

// autoScroll follows new messages while you're at the bottom; defaultScrollPosition is where the
// conversation opens.
let { autoScroll = false, defaultScrollPosition = "end", scrollEdgeThreshold, scrollPreviousItemPeek, scrollMargin, children }: MessageScrollerProviderProps & { children?: Snippet } = $props();

const { engine } = setMessageScroller(() => ({ autoScroll, defaultScrollPosition, scrollEdgeThreshold, scrollPreviousItemPeek, scrollMargin }));
onMount(() => {
  engine.mounted();
  return engine.destroy;
});
let mounted = false;
$effect(() => {
  void autoScroll;
  void defaultScrollPosition;
  if (mounted) untrack(engine.update);
  mounted = true;
});`,
    markup: `{@render children?.()}`,
  });
  const root = svelteFile("message-scroller/message-scroller.svelte", {
    script: `${DIV}
import { untrack } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getMessageScroller } from "./context.svelte.js";

const classes = ${quoted(slots["message-scroller"])};

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();

const { engine, read } = getMessageScroller("MessageScroller.Root");
const pending = $derived(read((e) => e.pendingScroll));
$effect(() => {
  const element = ref;
  untrack(() => engine.setRoot(element));
});`,
    markup: `<div bind:this={ref} data-slot="message-scroller" data-pending-scroll={pending ? "" : undefined} class={cn(classes, className)} {...restProps}>
  {@render children?.()}
</div>`,
  });
  const viewport = svelteFile("message-scroller/message-scroller-viewport.svelte", {
    script: `${DIV}
import { untrack } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { observeResize, SCROLL_KEYS } from "./engine.js";
import { getMessageScroller } from "./context.svelte.js";

const classes = ${quoted(slots["message-scroller-viewport"])};

// preserveScrollOnPrepend keeps you with the messages you're reading when older ones load above.
let {
  ref = $bindable(null),
  class: className,
  preserveScrollOnPrepend = true,
  onscroll,
  onwheel,
  ontouchmove,
  onkeydown,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { preserveScrollOnPrepend?: boolean } = $props();

const { engine, read } = getMessageScroller("MessageScroller.Viewport");
const pending = $derived(read((e) => e.pendingScroll));
$effect(() => {
  engine.preserveScrollOnPrepend = preserveScrollOnPrepend;
});
$effect(() => {
  const element = ref;
  untrack(() => engine.setViewport(element));
  return element === null ? undefined : observeResize(element, engine.handleResize);
});

// A key that scrolls, a wheel or a touch is the reader taking over.
const handleScroll: HTMLAttributes<HTMLDivElement>["onscroll"] = (event) => {
  engine.syncAfterScroll();
  onscroll?.(event);
};
const handleWheel: HTMLAttributes<HTMLDivElement>["onwheel"] = (event) => {
  engine.userScrollIntent();
  onwheel?.(event);
};
const handleTouchMove: HTMLAttributes<HTMLDivElement>["ontouchmove"] = (event) => {
  engine.userScrollIntent();
  ontouchmove?.(event);
};
const handleKeyDown: HTMLAttributes<HTMLDivElement>["onkeydown"] = (event) => {
  if (SCROLL_KEYS.has(event.key)) engine.userScrollIntent();
  onkeydown?.(event);
};`,
    // A region you can scroll with the keyboard takes the focus, as @shadcn/react's does.
    markup: `<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={ref}
  data-slot="message-scroller-viewport"
  role="region"
  aria-label="Messages"
  tabindex={0}
  data-pending-scroll={pending ? "" : undefined}
  class={cn(classes, className)}
  onscroll={handleScroll}
  onwheel={handleWheel}
  ontouchmove={handleTouchMove}
  onkeydown={handleKeyDown}
  {...restProps}
>
  {@render children?.()}
</div>`,
  });
  const content = svelteFile("message-scroller/message-scroller-content.svelte", {
    script: `${DIV}
import { untrack } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { observeChildren, observeResize } from "./engine.js";
import { getMessageScroller } from "./context.svelte.js";

const classes = ${quoted(slots["message-scroller-content"])};

// spacerClass styles the space after the last message that lets an anchored one reach the top.
let { ref = $bindable(null), class: className, spacerClass, children, ...restProps }: WithElementRef<HTMLAttributes<HTMLDivElement>> & { spacerClass?: string } = $props();

const { engine } = getMessageScroller("MessageScroller.Content");
let spacer = $state<HTMLDivElement | null>(null);
$effect(() => {
  const element = ref;
  const space = spacer;
  if (element === null) return;
  const stops = untrack(() => {
    engine.setContent(element);
    engine.setSpacer(space);
    engine.handleContentChange();
    return [observeChildren(element, engine.handleContentChange), observeResize(element, engine.handleResize)];
  });
  return () => {
    for (const stop of stops) stop();
    engine.setContent(null);
    engine.setSpacer(null);
  };
});`,
    markup: `<div bind:this={ref} data-slot="message-scroller-content" role="log" aria-relevant="additions" class={cn(classes, className)} {...restProps}>
  {@render children?.()}
  <div bind:this={spacer} aria-hidden="true" data-message-scroller-spacer="" hidden class={spacerClass}></div>
</div>`,
  });
  const item = svelteFile("message-scroller/message-scroller-item.svelte", {
    script: `${DIV}
import { untrack } from "svelte";
${UTILS_IMPORT(["cn", "type WithElementRef"])}
import { getMessageScroller } from "./context.svelte.js";

const classes = ${quoted(slots["message-scroller-item"])};

// messageId makes the item a target for scrollToMessage and visibility; scrollAnchor keeps it in
// view as newer ones arrive.
let {
  ref = $bindable(null),
  class: className,
  messageId,
  scrollAnchor = false,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { messageId?: string; scrollAnchor?: boolean } = $props();

const { engine } = getMessageScroller("MessageScroller.Item");
$effect(() => {
  const element = ref;
  const id = messageId;
  if (element === null || !id) return;
  untrack(() => engine.registerMessage(id, element, null));
  return () => engine.registerMessage(id, null, element);
});`,
    markup: `<div
  bind:this={ref}
  data-slot="message-scroller-item"
  data-message-id={messageId}
  data-scroll-anchor={scrollAnchor ? "true" : "false"}
  class={cn(classes, className)}
  {...restProps}
>
  {@render children?.()}
</div>`,
  });
  const jump = svelteFile("message-scroller/message-scroller-button.svelte", {
    script: `${lucideImport("ArrowDownIcon")}
${uiImport("button", ["Button", "type ButtonProps"])}
${UTILS_IMPORT(["cn"])}
import type { MessageScrollerButtonDirection } from "./engine.js";
import { getMessageScroller } from "./context.svelte.js";

const classes = ${quoted(slots["message-scroller-button"])};
const srOnly = "sr-only";

// Appears when you have scrolled away from the newest (or, direction="start", the oldest) message.
// Your onclick runs first, and can keep the jump from happening (preventDefault).
let {
  ref = $bindable(null),
  class: className,
  direction = "end",
  behavior = "smooth",
  variant = ${q(button.variant)},
  size = ${q(button.size)},
  tabindex,
  onclick,
  children,
  ...restProps
}: ButtonProps & { direction?: MessageScrollerButtonDirection; behavior?: ScrollBehavior } = $props();

const { engine, read } = getMessageScroller("MessageScroller.Button");
const active = $derived(read((e) => (direction === "start" ? e.scrollable.start : e.scrollable.end)));

function handleClick(event: MouseEvent) {
  if (!active) return;
  (onclick as ((event: MouseEvent) => void) | null | undefined)?.(event);
  if (event.defaultPrevented) return;
  (event.currentTarget as HTMLElement | null)?.blur();
  if (direction === "start") engine.scrollToStart({ behavior });
  else engine.scrollToEnd({ behavior });
}`,
    markup: `<Button
  bind:ref
  data-slot="message-scroller-button"
  data-direction={direction}
  data-active={active ? "true" : "false"}
  {variant}
  {size}
  type="button"
  inert={!active}
  tabindex={active ? tabindex : -1}
  class={cn(classes, className)}
  onclick={handleClick}
  {...restProps}
>
  {#if children}
    {@render children()}
  {:else}
    <ArrowDownIcon />
    <span class={srOnly}>{direction === "end" ? "Scroll to end" : "Scroll to start"}</span>
  {/if}
</Button>`,
  });
  return [
    { path: "message-scroller/engine.ts", source: MESSAGE_SCROLLER_ENGINE },
    context,
    provider,
    root,
    viewport,
    content,
    item,
    jump,
    indexFile(
      "message-scroller/index.ts",
      indexParts([
        ["message-scroller-provider.svelte", "Provider", "MessageScrollerProvider"],
        ["message-scroller.svelte", "Root", "MessageScroller"],
        ["message-scroller-viewport.svelte", "Viewport", "MessageScrollerViewport"],
        ["message-scroller-content.svelte", "Content", "MessageScrollerContent"],
        ["message-scroller-item.svelte", "Item", "MessageScrollerItem"],
        ["message-scroller-button.svelte", "Button", "MessageScrollerButton"],
      ]),
      [
        { file: "context.svelte.js", names: ["useMessageScroller", "useMessageScrollerScrollable", "useMessageScrollerVisibility"] },
        {
          file: "engine.js",
          names: [
            "type MessageScrollerButtonDirection",
            "type MessageScrollerDefaultScrollPosition",
            "type MessageScrollerProviderProps",
            "type MessageScrollerScrollable",
            "type MessageScrollerScrollAlign",
            "type MessageScrollerScrollOptions",
            "type MessageScrollerVisibilityState",
          ],
        },
      ],
    ),
  ];
}
