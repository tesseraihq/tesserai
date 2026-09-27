// The behaviour of the chat components that have one, written once and emitted as a plain
// TypeScript module into both the Vue and the Svelte folder (engine.ts): the parts wire their
// elements in and re-render when it says something changed, each the way its framework does
// (Vue's refs, Svelte's runes). Both are ports of @shadcn/react's, which the React output imports.

export const MESSAGE_SCROLLER_ENGINE = `// The message scroller's behaviour, the same in every framework: it keeps a conversation at its
// newest message, holds a message you jumped to (or the turn now streaming) at the top, keeps your
// place when older messages are prepended, and says which way you can still scroll. Ported from
// @shadcn/react's MessageScroller. The component files wire their elements in and re-render on
// change().

export type MessageScrollerDefaultScrollPosition = "start" | "end" | "last-anchor";
export type MessageScrollerButtonDirection = "start" | "end";
export type MessageScrollerScrollAlign = "start" | "center" | "end" | "nearest";
export type MessageScrollerScrollOptions = { align?: MessageScrollerScrollAlign | undefined; behavior?: ScrollBehavior | undefined; scrollMargin?: number | undefined };
export type MessageScrollerScrollable = { start: boolean; end: boolean };
export type MessageScrollerVisibilityState = { currentAnchorId: string | null; visibleMessageIds: string[] };
export type MessageScrollerProviderProps = {
  // Follow new messages to the bottom while you're there.
  autoScroll?: boolean | undefined;
  // Where a conversation opens: its start, its end, or its last anchored message.
  defaultScrollPosition?: MessageScrollerDefaultScrollPosition | undefined;
  // How far from an edge still counts as at it, in pixels.
  scrollEdgeThreshold?: number | undefined;
  // How much of the message before an anchored one stays in view, in pixels.
  scrollPreviousItemPeek?: number | undefined;
  scrollMargin?: number | undefined;
};

// Keys that scroll the viewport: pressing one is the reader taking over.
export const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);

const DEFAULTS: { [K in keyof MessageScrollerProviderProps]-?: NonNullable<MessageScrollerProviderProps[K]> } = { autoScroll: false, defaultScrollPosition: "end", scrollEdgeThreshold: 8, scrollPreviousItemPeek: 64, scrollMargin: 0 };
const EPSILON = 0.5;
const AUTOSCROLLING_TIMEOUT = 180;
const NOT_SCROLLABLE: MessageScrollerScrollable = { start: false, end: false };
const NOTHING_VISIBLE: MessageScrollerVisibilityState = { currentAnchorId: null, visibleMessageIds: [] };

type Mode = "following-bottom" | "free-scrolling" | "anchored-to-message" | "settling-jump";

const px = (value: string | null | undefined) => {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};
function padding(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return { start: px(style.paddingBlockStart || style.paddingTop), end: px(style.paddingBlockEnd || style.paddingBottom) };
}
const messages = (content: HTMLElement, spacer: HTMLElement | null) => Array.from(content.children).filter((child): child is HTMLElement => child instanceof HTMLElement && child !== spacer);
const isAnchor = (element: HTMLElement | undefined) => element?.dataset["scrollAnchor"] === "true";
const offsetTop = (element: HTMLElement, viewport: HTMLElement) => element.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
const relativeTop = (element: HTMLElement, viewport: HTMLElement) => element.getBoundingClientRect().top - viewport.getBoundingClientRect().top;
const maxScrollTop = (viewport: HTMLElement) => Math.max(0, viewport.scrollHeight - viewport.clientHeight);

// How tall the messages are, measured from the top of the scrolled content.
function contentHeight(content: HTMLElement, spacer: HTMLElement | null, viewport: HTMLElement) {
  const pad = padding(content);
  const top = viewport.getBoundingClientRect().top;
  let height = pad.start + pad.end;
  for (const child of messages(content, spacer)) height = Math.max(height, child.getBoundingClientRect().bottom - top + viewport.scrollTop + pad.end);
  return height;
}

function sameScrollable(a: MessageScrollerScrollable, b: MessageScrollerScrollable) {
  return a.start === b.start && a.end === b.end;
}
function sameVisibility(a: MessageScrollerVisibilityState, b: MessageScrollerVisibilityState) {
  return a.currentAnchorId === b.currentAnchorId && a.visibleMessageIds.length === b.visibleMessageIds.length && a.visibleMessageIds.every((id, i) => id === b.visibleMessageIds[i]);
}

export class MessageScrollerEngine {
  // What the parts render: which way you can scroll, which messages are in view, and whether the
  // conversation is still waiting to be placed (it's drawn invisible until then).
  scrollable: MessageScrollerScrollable = NOT_SCROLLABLE;
  visibility: MessageScrollerVisibilityState = NOTHING_VISIBLE;
  pendingScroll: boolean;
  // Called whenever one of those changes.
  change: () => void = () => {};

  private root: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;
  private content: HTMLElement | null = null;
  private spacer: HTMLElement | null = null;
  private spacerGap = 0;
  private spacerHeight = 0;
  private mode: Mode;
  private streamingTurn: HTMLElement | null = null;
  private firstItem: HTMLElement | null = null;
  private itemCount = 0;
  private lastScrollTop = 0;
  private autoscrolling = false;
  private defaultApplied = false;
  private defaultPosition: MessageScrollerDefaultScrollPosition;
  preserveScrollOnPrepend = true;
  private prependRestore: { element: HTMLElement; viewportTop: number } | null = null;
  private pendingScrollToMessage: { messageId: string; options: MessageScrollerScrollOptions | undefined } | null = null;
  private stateFrame: number | null = null;
  private visibilityFrame: number | null = null;
  private pendingScrollFrame: number | null = null;
  private autoscrollingTimeout: ReturnType<typeof setTimeout> | null = null;
  private visibilityObserver: IntersectionObserver | null = null;
  private visibilityConsumers = 0;
  private readonly messageElements = new Map<string, HTMLElement>();
  private readonly visibleIds = new Set<string>();
  private readonly handledAnchors = new WeakSet<HTMLElement>();

  private readonly props: () => MessageScrollerProviderProps;

  // props: a getter, so the options stay live as the provider's props change.
  constructor(props: () => MessageScrollerProviderProps) {
    this.props = props;
    this.defaultPosition = this.option("defaultScrollPosition");
    this.mode = this.option("autoScroll") ? "following-bottom" : "free-scrolling";
    this.pendingScroll = this.defaultPosition === "end" || this.defaultPosition === "last-anchor";
  }

  private option<K extends keyof MessageScrollerProviderProps>(key: K): NonNullable<MessageScrollerProviderProps[K]> {
    return (this.props()[key] ?? DEFAULTS[key]) as NonNullable<MessageScrollerProviderProps[K]>;
  }

  // ---------- the elements ----------

  setRoot = (element: HTMLElement | null) => {
    this.root = element;
    if (element !== null) this.writeAttributes(this.scrollable);
  };
  setViewport = (element: HTMLElement | null) => {
    this.viewport = element;
    if (element === null) return;
    this.writeAttributes(this.scrollable);
    // A visibility reader may have asked before the viewport was there.
    this.observeVisibility();
  };
  setContent = (element: HTMLElement | null) => {
    this.content = element;
  };
  setSpacer = (element: HTMLElement | null) => {
    this.spacer = element;
    const parent = element?.parentElement;
    if (parent === null || parent === undefined) {
      this.spacerGap = 0;
      return;
    }
    const style = window.getComputedStyle(parent);
    this.spacerGap = px(style.rowGap === "normal" ? style.gap : style.rowGap);
  };

  // An item with a messageId, so scrollToMessage and visibility can find it.
  registerMessage = (messageId: string, element: HTMLElement | null, previous: HTMLElement | null) => {
    if (element !== null) {
      this.messageElements.set(messageId, element);
      this.visibilityObserver?.observe(element);
      this.scheduleVisibility();
      if (this.pendingScrollToMessage?.messageId === messageId) this.schedulePendingScroll();
      return;
    }
    if (previous !== null && this.messageElements.get(messageId) === previous) {
      this.messageElements.delete(messageId);
      this.visibleIds.delete(messageId);
      this.visibilityObserver?.unobserve(previous);
      this.scheduleVisibility();
    }
  };

  // ---------- state ----------

  private setPending(pending: boolean) {
    if (this.pendingScroll === pending) return;
    this.pendingScroll = pending;
    this.change();
  }

  private markDefaultApplied() {
    this.defaultApplied = true;
    this.setPending(false);
  }

  // data-scrollable ("start end") and data-autoscrolling on the root and the viewport, written
  // straight to the elements as the scroll goes.
  private writeAttributes(scrollable: MessageScrollerScrollable) {
    const value = [scrollable.start ? "start" : "", scrollable.end ? "end" : ""].filter(Boolean).join(" ");
    for (const element of [this.root, this.viewport]) {
      if (element === null) continue;
      if (value) element.setAttribute("data-scrollable", value);
      else element.removeAttribute("data-scrollable");
      element.toggleAttribute("data-autoscrolling", this.autoscrolling);
    }
  }

  private measure(): MessageScrollerScrollable {
    const { viewport, content } = this;
    if (viewport === null || content === null) return NOT_SCROLLABLE;
    const threshold = this.option("scrollEdgeThreshold");
    return { start: viewport.scrollTop > threshold, end: contentHeight(content, this.spacer, viewport) - viewport.scrollTop - viewport.clientHeight > threshold };
  }

  private commit = () => {
    const measured = this.measure();
    const scrollTop = this.viewport?.scrollTop ?? 0;
    const scrolledUp = scrollTop < this.lastScrollTop - EPSILON;
    this.lastScrollTop = scrollTop;
    // Back to following once the reader reaches the bottom, but not on a scroll up: a smooth Home or
    // PageUp (WebKit's) starts within the edge threshold, and following there snapped the reader
    // back to the end as soon as a message resized (off-screen ones are drawn at their real height).
    if (this.option("autoScroll") && !measured.end && !scrolledUp && this.mode !== "settling-jump" && this.mode !== "anchored-to-message") this.mode = "following-bottom";
    else if (this.mode === "following-bottom" && measured.end && scrolledUp && !this.autoscrolling) this.mode = "free-scrolling";
    // While following the bottom there's nothing below to jump to.
    const next = this.mode === "following-bottom" ? { ...measured, end: false } : measured;
    this.writeAttributes(next);
    if (sameScrollable(this.scrollable, next)) return;
    this.scrollable = next;
    this.change();
  };

  private scheduleCommit() {
    if (this.stateFrame !== null) return;
    this.stateFrame = window.requestAnimationFrame(() => {
      this.stateFrame = null;
      this.commit();
    });
  }

  private scheduleVisibility() {
    if (this.visibilityConsumers === 0 || this.visibilityFrame !== null) return;
    this.visibilityFrame = window.requestAnimationFrame(() => {
      this.visibilityFrame = null;
      if (this.visibilityConsumers === 0) return;
      const next = this.measureVisibility();
      if (sameVisibility(this.visibility, next)) return;
      this.visibility = next;
      this.change();
    });
  }

  private measureVisibility(): MessageScrollerVisibilityState {
    const { viewport, content } = this;
    if (viewport === null || content === null) return NOTHING_VISIBLE;
    const box = viewport.getBoundingClientRect();
    const line = box.top + this.option("scrollMargin") + this.option("scrollPreviousItemPeek");
    const noObserver = typeof IntersectionObserver === "undefined";
    const visible: string[] = [];
    let currentAnchorId: string | null = null;
    for (const child of messages(content, this.spacer)) {
      const id = child.dataset["messageId"];
      if (!id) continue;
      const anchor = isAnchor(child);
      const rect = anchor || noObserver ? child.getBoundingClientRect() : null;
      if (noObserver && rect !== null ? rect.bottom > line && rect.top < box.bottom : this.visibleIds.has(id)) visible.push(id);
      if (anchor && rect !== null && rect.top <= line + EPSILON) currentAnchorId = id;
    }
    return visible.length === 0 && currentAnchorId === null ? NOTHING_VISIBLE : { currentAnchorId, visibleMessageIds: visible };
  }

  // ---------- scrolling ----------

  private setAutoscrolling(active: boolean) {
    if (this.autoscrollingTimeout !== null) {
      clearTimeout(this.autoscrollingTimeout);
      this.autoscrollingTimeout = null;
    }
    if (this.autoscrolling !== active) {
      this.autoscrolling = active;
      this.commit();
    }
    if (!active) return;
    this.autoscrollingTimeout = setTimeout(() => {
      this.autoscrollingTimeout = null;
      this.autoscrolling = false;
      this.commit();
    }, AUTOSCROLLING_TIMEOUT);
  }

  // The space after the last message that lets an anchored one reach the top.
  private setSpacerHeight(height: number) {
    const spacer = this.spacer;
    if (spacer === null) return;
    const next = Math.max(0, Math.ceil(height));
    if (this.spacerHeight === next) return;
    this.spacerHeight = next;
    spacer.hidden = next === 0;
    spacer.style.height = next + "px";
    spacer.style.marginTop = next > 0 ? -this.spacerGap + "px" : "";
  }

  private scrollTo(top: number, { behavior = "auto", autoscrolling = false }: { behavior?: ScrollBehavior; autoscrolling?: boolean } = {}) {
    const viewport = this.viewport;
    if (viewport === null) return;
    const target = Math.max(0, top);
    if (Math.abs(viewport.scrollTop - target) <= EPSILON) {
      viewport.scrollTop = target;
      this.commit();
      return;
    }
    if (autoscrolling) this.setAutoscrolling(true);
    viewport.scrollTo({ top: target, behavior });
    this.scheduleCommit();
  }

  scrollToStart = ({ behavior = "auto" }: { behavior?: ScrollBehavior | undefined } = {}): boolean => {
    if (this.viewport === null) return false;
    this.setSpacerHeight(0);
    this.streamingTurn = null;
    this.mode = "free-scrolling";
    this.scrollTo(0, { behavior });
    this.scheduleVisibility();
    return true;
  };

  scrollToEnd = ({ behavior = "auto" }: { behavior?: ScrollBehavior | undefined } = {}): boolean => {
    const viewport = this.viewport;
    if (viewport === null) return false;
    this.setSpacerHeight(0);
    this.streamingTurn = null;
    this.mode = this.option("autoScroll") ? "following-bottom" : "free-scrolling";
    this.scrollTo(maxScrollTop(viewport), { autoscrolling: true, behavior });
    this.scheduleVisibility();
    return true;
  };

  // Where the viewport's top goes to show a message aligned as asked.
  private topFor(element: HTMLElement, align: MessageScrollerScrollAlign, margin: number) {
    const viewport = this.viewport!;
    const top = offsetTop(element, viewport);
    const height = element.getBoundingClientRect().height;
    const parent = this.spacer?.parentElement;
    const pad = parent === null || parent === undefined ? { start: 0, end: 0 } : padding(parent);
    if (align === "center") return top - pad.start - (Math.max(0, viewport.clientHeight - pad.start - pad.end) - height) / 2 - margin;
    if (align === "end") return top - viewport.clientHeight + height + pad.end + margin;
    if (align === "nearest") {
      const bottom = top + height;
      const shownTop = viewport.scrollTop + pad.start;
      const shownBottom = viewport.scrollTop + viewport.clientHeight - pad.end;
      if (top >= shownTop && bottom <= shownBottom) return viewport.scrollTop;
      return top < shownTop ? top - pad.start - margin : bottom - viewport.clientHeight + pad.end + margin;
    }
    return top - pad.start - margin;
  }

  private scrollToElement(element: HTMLElement, { align = "start", behavior = "auto", scrollMargin }: MessageScrollerScrollOptions = {}, keepPreviousPeek = false): boolean {
    const { content, viewport } = this;
    if (content === null || viewport === null || !content.contains(element)) return false;
    const margin = scrollMargin ?? this.option("scrollMargin");
    const top = this.topFor(element, align, keepPreviousPeek ? margin + this.option("scrollPreviousItemPeek") : margin);
    this.setSpacerHeight(top + viewport.clientHeight - contentHeight(content, this.spacer, viewport));
    this.prependRestore = { element, viewportTop: relativeTop(element, viewport) };
    this.mode = keepPreviousPeek ? "anchored-to-message" : "settling-jump";
    this.streamingTurn = keepPreviousPeek ? element : null;
    this.scrollTo(top, { behavior });
    this.scheduleVisibility();
    return true;
  }

  scrollToMessage = (messageId: string, options?: MessageScrollerScrollOptions): boolean => {
    const element = this.messageElements.get(messageId);
    if (element !== undefined) {
      this.markDefaultApplied();
      this.pendingScrollToMessage = this.scrollToElement(element, options) ? null : { messageId, options };
      return true;
    }
    // Before any message is there, the scroll waits for it.
    if (this.itemCount === 0) {
      this.pendingScrollToMessage = { messageId, options };
      this.markDefaultApplied();
      return true;
    }
    return false;
  };

  private flushPendingScroll(): boolean {
    const pending = this.pendingScrollToMessage;
    if (pending === null) return false;
    const element = this.messageElements.get(pending.messageId);
    if (element === undefined || !this.scrollToElement(element, pending.options)) return false;
    this.pendingScrollToMessage = null;
    this.markDefaultApplied();
    return true;
  }

  private schedulePendingScroll() {
    if (this.pendingScrollFrame !== null) return;
    this.pendingScrollFrame = window.requestAnimationFrame(() => {
      this.pendingScrollFrame = null;
      if (this.flushPendingScroll()) this.capturePrependAnchor();
    });
  }

  // ---------- keeping your place ----------

  private restorePrepend(): boolean {
    const restore = this.prependRestore;
    const viewport = this.viewport;
    if (restore === null || viewport === null || !restore.element.isConnected) return false;
    const delta = relativeTop(restore.element, viewport) - restore.viewportTop;
    if (Math.abs(delta) <= EPSILON) return false;
    viewport.scrollTop += delta;
    restore.viewportTop = relativeTop(restore.element, viewport);
    this.scheduleCommit();
    this.scheduleVisibility();
    return true;
  }

  private capturePrependAnchor() {
    const { content, viewport } = this;
    if (content === null || viewport === null) {
      this.prependRestore = null;
      return;
    }
    const box = viewport.getBoundingClientRect();
    const first = messages(content, this.spacer).find((child) => {
      if (!child.dataset["messageId"]) return false;
      const rect = child.getBoundingClientRect();
      return rect.bottom > box.top && rect.top < box.bottom;
    });
    this.prependRestore = first === undefined ? null : { element: first, viewportTop: relativeTop(first, viewport) };
  }

  private applyDefaultPosition(): boolean {
    if (this.defaultApplied || this.itemCount === 0) return false;
    let applied: boolean;
    if (this.defaultPosition === "last-anchor") {
      const { content, viewport } = this;
      const all = content === null ? [] : messages(content, this.spacer);
      const last = [...all].reverse().find((element) => isAnchor(element));
      if (content === null || viewport === null || last === undefined) applied = this.scrollToEnd();
      else applied = contentHeight(content, this.spacer, viewport) - offsetTop(last, viewport) <= viewport.clientHeight ? this.scrollToEnd() : this.scrollToElement(last, { align: "start" }, true);
    } else applied = this.defaultPosition === "end" ? this.scrollToEnd() : this.scrollToStart();
    if (applied) this.markDefaultApplied();
    return applied;
  }

  // ---------- events ----------

  // The content's children changed: a message added, removed or prepended.
  handleContentChange = () => {
    const content = this.content;
    if (content === null) return;
    const children = messages(content, this.spacer);
    const previousCount = this.itemCount;
    const previousFirst = this.firstItem;
    this.itemCount = children.length;
    this.firstItem = children[0] ?? null;
    this.applyContentChange(children, previousCount, previousFirst);
    this.capturePrependAnchor();
  };

  private applyContentChange(children: HTMLElement[], previousCount: number, previousFirst: HTMLElement | null) {
    const autoScroll = this.option("autoScroll");
    if (this.flushPendingScroll()) return;
    if (previousCount === 0) {
      if (this.applyDefaultPosition() || (children.length > 0 && autoScroll && this.scrollToEnd())) return;
      this.commit();
      this.scheduleVisibility();
      return;
    }
    // Older messages went in above: stay with the ones you were reading.
    if (this.preserveScrollOnPrepend && previousFirst !== null && children.indexOf(previousFirst) > 0) {
      this.restorePrepend();
      return;
    }
    if (children.length > previousCount) {
      const added = children.slice(previousCount);
      const anchor = added.find((element) => isAnchor(element));
      if (anchor !== undefined) {
        if (autoScroll && this.mode === "following-bottom" && added.filter((element) => isAnchor(element)).length > 1) {
          this.scrollToEnd();
          return;
        }
        this.scrollToElement(anchor, { align: "start" }, true);
        this.handledAnchors.add(anchor);
        return;
      }
    }
    if (children.length === previousCount) {
      const anchor = children.find((element) => isAnchor(element) && !this.handledAnchors.has(element));
      if (anchor !== undefined) {
        this.scrollToElement(anchor, { align: "start" }, true);
        this.handledAnchors.add(anchor);
        return;
      }
    }
    if (this.mode === "following-bottom" && autoScroll) this.scrollToEnd();
    else {
      this.commit();
      this.scheduleVisibility();
    }
  }

  // The viewport or the content changed size (a reply streaming in).
  handleResize = () => {
    const autoScroll = this.option("autoScroll");
    if (this.mode === "following-bottom" && autoScroll) {
      this.scrollToEnd();
      return;
    }
    const previousSpacer = this.spacerHeight;
    const turn = this.streamingTurn;
    if (turn !== null && turn.isConnected && this.mode === "anchored-to-message" && this.scrollToElement(turn, { align: "start" }, true)) {
      // The reply has filled the space under its question: from here, follow the bottom.
      if (autoScroll && previousSpacer > 0 && this.spacerHeight === 0) this.scrollToEnd();
      return;
    }
    this.scheduleCommit();
    this.scheduleVisibility();
  };

  syncAfterScroll = () => {
    this.commit();
    this.scheduleVisibility();
    this.capturePrependAnchor();
  };

  // The reader scrolled (wheel, touch, a scrolling key): stop following or holding.
  userScrollIntent = () => {
    if (this.mode === "free-scrolling") return;
    this.streamingTurn = null;
    this.mode = "free-scrolling";
  };

  // Once every part is in: open at the default position, or stop waiting if there's nothing yet.
  mounted = () => {
    if (!this.applyDefaultPosition() && this.itemCount === 0) this.setPending(false);
    this.syncAfterScroll();
  };

  // The props changed: a new default position applies to the next content; autoScroll starts
  // following at once.
  update = () => {
    const position = this.option("defaultScrollPosition");
    if (position !== this.defaultPosition) {
      this.defaultPosition = position;
      this.defaultApplied = false;
    }
    if (this.option("autoScroll") && this.mode === "following-bottom" && this.itemCount > 0) this.scrollToEnd();
    else this.commit();
  };

  // ---------- visibility ----------

  private observeVisibility() {
    const viewport = this.viewport;
    if (viewport === null || this.visibilityConsumers === 0) return;
    if (typeof IntersectionObserver === "undefined") {
      this.scheduleVisibility();
      return;
    }
    this.visibilityObserver ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset["messageId"];
          if (!id) continue;
          if (entry.isIntersecting) this.visibleIds.add(id);
          else this.visibleIds.delete(id);
        }
        this.scheduleVisibility();
      },
      { root: viewport, rootMargin: -(this.option("scrollMargin") + this.option("scrollPreviousItemPeek")) + "px 0px 0px 0px", threshold: [0, 0.01, 0.5, 1] },
    );
    for (const element of this.messageElements.values()) this.visibilityObserver.observe(element);
    this.scheduleVisibility();
  }

  // A reader of the visible messages came or went: they're only measured while someone reads them.
  acquireVisibility = () => {
    this.visibilityConsumers += 1;
    if (this.visibilityConsumers === 1) this.observeVisibility();
  };
  releaseVisibility = () => {
    this.visibilityConsumers -= 1;
    if (this.visibilityConsumers > 0) return;
    if (this.visibilityFrame !== null) window.cancelAnimationFrame(this.visibilityFrame);
    this.visibilityFrame = null;
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
    this.visibleIds.clear();
    if (sameVisibility(this.visibility, NOTHING_VISIBLE)) return;
    this.visibility = NOTHING_VISIBLE;
    this.change();
  };

  destroy = () => {
    for (const frame of [this.stateFrame, this.visibilityFrame, this.pendingScrollFrame]) if (frame !== null) window.cancelAnimationFrame(frame);
    this.stateFrame = this.visibilityFrame = this.pendingScrollFrame = null;
    if (this.autoscrollingTimeout !== null) clearTimeout(this.autoscrollingTimeout);
    this.autoscrollingTimeout = null;
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = null;
  };
}

// Calls frame() on the next animation frame after the element resizes, until the returned stop.
export function observeResize(element: HTMLElement, frame: () => void): () => void {
  if (typeof ResizeObserver === "undefined") return () => {};
  let id = 0;
  const observer = new ResizeObserver(() => {
    window.cancelAnimationFrame(id);
    id = window.requestAnimationFrame(frame);
  });
  observer.observe(element);
  return () => {
    window.cancelAnimationFrame(id);
    observer.disconnect();
  };
}

// Calls change() whenever the element's children change, until the returned stop.
export function observeChildren(element: HTMLElement, change: () => void): () => void {
  if (typeof MutationObserver === "undefined") return () => {};
  const observer = new MutationObserver(change);
  observer.observe(element, { childList: true });
  return () => observer.disconnect();
}
`;

export const QUESTIONNAIRE_ENGINE = `// The questionnaire's behaviour, the same in every framework: one question at a time, each answered
// by a choice (a radio, or checkboxes when it takes several) or by typing, checked before moving on,
// skippable when it isn't required, with keyboard shortcuts. Ported from @shadcn/react's
// Questionnaire. The component files register their elements once mounted and re-render on change().

export type QuestionnaireItemStatus = "unanswered" | "answered" | "skipped";
export type QuestionnaireShortcutMode = "letters" | "numbers";
export type QuestionnaireChoiceDefinition = { disabled?: boolean; value: string };
export type QuestionnaireItemDefinition = { choices?: readonly QuestionnaireChoiceDefinition[]; disabled?: boolean; name: string; required?: boolean };
export type QuestionnaireInputType = "date" | "datetime-local" | "email" | "month" | "number" | "password" | "search" | "tel" | "text" | "time" | "url" | "week";

export type QuestionnaireRootOptions = {
  // The questions in order (with their choices), so progress and shortcuts are known before they render.
  items?: readonly QuestionnaireItemDefinition[] | undefined;
  // The question shown first, or (controlled) the one shown now.
  defaultItem?: string | undefined;
  item?: string | undefined;
  shortcuts?: QuestionnaireShortcutMode | undefined;
  // false: the browser's own validation (required, type) runs too.
  noValidate?: boolean | undefined;
};
export type QuestionnaireItemOptions = { name: string; required?: boolean | undefined; multiple?: boolean | undefined; disabled?: boolean | undefined; invalid?: boolean | undefined };

type Answer = { id: string; type: "choice" | "input"; element: HTMLInputElement; value: string; disabled: boolean; ownDisabled: boolean };

// Whether a typed answer has anything in it.
export const hasValue = (value: unknown) => (Array.isArray(value) ? value.some((v) => String(v).trim().length > 0) : value !== undefined && value !== null && String(value).trim().length > 0);
const shortcutKeys = (mode: QuestionnaireShortcutMode | null) =>
  mode === "letters" ? Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) : mode === "numbers" ? Array.from({ length: 9 }, (_, i) => String(i + 1)) : [];
// A shortcut key and, once answered, Enter: an answer's aria-keyshortcuts.
const answerShortcuts = (shortcut: string | null, filled: boolean) => [shortcut, filled ? "Enter" : null].filter(Boolean).join(" ") || undefined;
const isFilled = (answer: Answer) => (answer.type === "choice" ? answer.element.checked : answer.element.hasAttribute("name") && hasValue(answer.element.value));
const isEmptyText = (answer: Answer | null) => answer?.type === "input" && ["email", "password", "search", "tel", "text", "url"].includes(answer.element.type) && !hasValue(answer.element.value);
const isTextEntry = (element: Element) =>
  element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
    ? true
    : element instanceof HTMLInputElement
      ? !["button", "checkbox", "radio", "reset", "submit"].includes(element.type)
      : element instanceof HTMLElement && element.isContentEditable;
const isRadio = (element: Element) => element instanceof HTMLInputElement && element.type === "radio";
function inDocumentOrder<T extends { element: Element }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.element === b.element) return 0;
    const position = a.element.compareDocumentPosition(b.element);
    return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
  });
}

// The data attributes a part's state writes: true is present, false absent, anything else its value.
export function dataAttributes(state: Record<string, string | number | boolean | null | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(state).map(([key, value]) => ["data-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()), typeof value === "boolean" ? (value ? "" : undefined) : value === null || value === undefined ? undefined : String(value)]));
}

export class QuestionnaireItemEngine {
  element: HTMLFieldSetElement | null = null;
  answers: Answer[] = [];
  selected: string[] = [];
  private defaults: string[] = [];
  skipped = false;
  touched = false;
  resetVersion = 0;
  descriptions: string[] = [];
  errors: string[] = [];
  private lastStatus: QuestionnaireItemStatus = "unanswered";
  private wasMultiple: boolean;
  readonly root: QuestionnaireEngine;
  readonly options: () => QuestionnaireItemOptions;
  // Called when the status changes (answered, skipped, unanswered again).
  statusChange: (status: QuestionnaireItemStatus) => void = () => {};

  constructor(root: QuestionnaireEngine, options: () => QuestionnaireItemOptions) {
    this.root = root;
    this.options = options;
    this.wasMultiple = options().multiple ?? false;
  }

  get name() {
    return this.options().name;
  }
  get required() {
    return this.options().required ?? false;
  }
  get multiple() {
    return this.options().multiple ?? false;
  }
  get disabled() {
    return this.options().disabled ?? false;
  }
  get active() {
    return !this.disabled && this.root.current === this.name;
  }
  get enabledAnswers() {
    return inDocumentOrder(this.answers).filter((a) => !a.disabled);
  }
  get status(): QuestionnaireItemStatus {
    return this.skipped ? "skipped" : this.enabledAnswers.some((a) => this.selected.includes(a.id)) ? "answered" : "unanswered";
  }
  private get skippedOptional() {
    return this.status === "skipped" && !this.required;
  }
  get valid() {
    return this.disabled || this.skippedOptional || (!(this.options().invalid ?? false) && this.status === "answered");
  }
  get invalid() {
    return !this.disabled && !this.skippedOptional && ((this.options().invalid ?? false) || (this.touched && !this.valid));
  }
  get hasInputAnswer() {
    return this.enabledAnswers.some((a) => a.type === "input");
  }
  // With the root's items, a choice's shortcut is its place among the item's enabled choices;
  // without them, its place among the rendered ones.
  get shortcutByChoiceValue(): Map<string, string> | null {
    const collection = this.root.collection;
    if (collection === null) return null;
    const map = new Map<string, string>();
    const keys = shortcutKeys(this.root.shortcuts);
    let i = 0;
    for (const choice of collection.itemByName.get(this.name)?.choices ?? []) {
      if (choice.disabled) continue;
      const key = keys[i++];
      if (key === undefined) break;
      map.set(choice.value, key);
    }
    return map;
  }
  get shortcutByAnswerId(): Map<string, string> {
    if (this.root.collection !== null) return new Map();
    const keys = shortcutKeys(this.root.shortcuts);
    return new Map(
      this.enabledAnswers
        .filter((a) => a.type === "choice")
        .slice(0, keys.length)
        .map((a, i) => [a.id, keys[i]!]),
    );
  }

  // The fieldset's attributes.
  attributes(ariaDescribedby?: string, ariaKeyshortcuts?: string) {
    const active = this.active;
    const invalid = this.invalid;
    const root = this.root;
    return {
      "aria-describedby": [...this.descriptions, ...(invalid ? this.errors : []), ariaDescribedby].filter(Boolean).join(" ") || undefined,
      "aria-invalid": invalid || undefined,
      "aria-keyshortcuts":
        [
          ariaKeyshortcuts,
          active ? "Meta+Enter Control+Enter" : undefined,
          active && this.enabledAnswers.length > 0 ? "ArrowUp ArrowDown" : undefined,
          active && !root.first ? "ArrowLeft" : undefined,
          active && !root.last && this.status !== "unanswered" ? "ArrowRight" : undefined,
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      disabled: this.disabled,
      hidden: !active,
      inert: !active,
      tabindex: -1,
      ...dataAttributes({ active, disabled: this.disabled, invalid, multiple: this.multiple, required: this.required, status: this.status }),
    };
  }

  private select(id: string, selected: boolean) {
    const s = this.selected;
    this.selected = selected ? (this.multiple ? (s.includes(id) ? s : [...s, id]) : [id]) : s.filter((x) => x !== id);
  }

  // An answer the reader changed; a controlled one's value came in.
  selectFromInteraction = (id: string, selected: boolean) => {
    this.skipped = false;
    this.select(id, selected);
    this.root.notify();
  };
  syncControlled = (id: string, selected: boolean) => {
    if (selected) this.skipped = false;
    this.select(id, selected);
    this.root.notify();
  };

  // An answer mounted, selected from the start or not. Returns its removal.
  registerSelection = (id: string, selectedByDefault: boolean) => {
    if (selectedByDefault) {
      this.defaults = [...this.defaults.filter((x) => x !== id), id];
      const s = this.selected;
      this.selected = this.multiple ? (s.includes(id) ? s : [...s, id]) : s.length > 0 ? s : [id];
      this.root.notify();
    }
    return () => {
      this.defaults = this.defaults.filter((x) => x !== id);
      this.selected = this.selected.filter((x) => x !== id);
      this.root.notify();
    };
  };
  setDefault = (id: string, selectedByDefault: boolean) => {
    this.defaults = selectedByDefault ? (this.defaults.includes(id) ? this.defaults : [...this.defaults, id]) : this.defaults.filter((x) => x !== id);
  };
  registerAnswer = (answer: Answer) => {
    this.answers = [...this.answers.filter((a) => a.element !== answer.element && a.id !== answer.id), answer];
    this.root.notify();
    return () => {
      this.answers = this.answers.filter((a) => a !== answer);
      this.root.notify();
    };
  };
  registerDescription = (id: string) => this.registerId("descriptions", id);
  registerError = (id: string) => this.registerId("errors", id);
  private registerId(list: "descriptions" | "errors", id: string) {
    if (!this[list].includes(id)) this[list] = [...this[list], id];
    this.root.notify();
    return () => {
      this[list] = this[list].filter((x) => x !== id);
      this.root.notify();
    };
  }

  // Before moving on: marks the question checked, and says whether it may be left.
  validate = (): boolean => {
    this.touched = true;
    this.root.notify();
    if (!this.valid) return false;
    if (!this.root.nativeValidation) return true;
    const bad = this.enabledAnswers.find((a) => isFilled(a) && a.element.willValidate && !a.element.validity.valid);
    if (bad === undefined) return true;
    bad.element.focus();
    bad.element.reportValidity();
    return false;
  };
  focus = () => this.element?.focus();
  focusInvalid = () => {
    const element = this.element;
    const target = element?.querySelector<HTMLElement>("input[data-filled][name]:not(:disabled)") ?? element?.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), textarea:not(:disabled)") ?? element;
    target?.focus();
  };
  reset = () => {
    this.touched = false;
    this.skipped = false;
    this.selected = this.multiple ? [...this.defaults] : this.defaults.slice(0, 1);
    this.resetVersion += 1;
    this.root.notify();
  };
  skip = () => {
    if (this.required) return;
    this.selected = [];
    this.skipped = true;
    this.root.notify();
  };

  answerByElement = (element: Element) => this.enabledAnswers.find((a) => a.element === element) ?? null;
  answerByShortcut = (shortcut: string) => {
    const byValue = this.shortcutByChoiceValue;
    if (byValue !== null) {
      const value = [...byValue.entries()].find(([, key]) => key === shortcut)?.[0];
      return this.enabledAnswers.find((a) => a.type === "choice" && a.value === value) ?? null;
    }
    const id = [...this.shortcutByAnswerId.entries()].find(([, key]) => key === shortcut)?.[0];
    return this.enabledAnswers.find((a) => a.id === id) ?? null;
  };
  // Up and down move between answers (and pick a radio as they go).
  moveAnswerFocus = (from: Element, direction: "next" | "previous"): boolean => {
    const answers = this.enabledAnswers;
    const index = answers.findIndex((a) => a.element === from);
    const at = index < 0 ? null : (answers[index] ?? null);
    if (answers.length === 0 || (isTextEntry(from) && !isEmptyText(at)) || (index < 0 && from !== this.element)) return false;
    const next = index < 0 ? (answers.find(isFilled) ?? (direction === "next" ? answers[0] : answers[answers.length - 1])) : answers[(index + (direction === "next" ? 1 : -1) + answers.length) % answers.length];
    if (next === undefined || next.element === from || (index >= 0 && isRadio(from) && isRadio(next.element))) return false;
    next.element.focus();
    if (next.type === "choice" && isRadio(next.element)) next.element.click();
    return true;
  };

  // After a change: a question that stops taking several answers keeps its first; the status
  // change is reported.
  settle() {
    const multiple = this.multiple;
    if (this.wasMultiple && !multiple) {
      const first = this.enabledAnswers.find((a) => this.selected.includes(a.id));
      this.selected = first === undefined ? [] : [first.id];
      this.root.change();
    }
    this.wasMultiple = multiple;
    const status = this.status;
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.statusChange(status);
    }
  }
}

export class QuestionnaireEngine {
  form: HTMLFormElement | null = null;
  items: QuestionnaireItemEngine[] = [];
  private activeName: string | null;
  private lastCurrent: string | null;
  private focusRequest: { name: string; target: "item" | "invalid" } | null = null;
  private settling = false;
  private scheduled = false;
  readonly options: () => QuestionnaireRootOptions;
  // Called on every change, for the parts to re-render; itemChange when the shown question changes.
  change: () => void = () => {};
  itemChange: (item: string) => void = () => {};

  constructor(options: () => QuestionnaireRootOptions) {
    this.options = options;
    this.activeName = this.initialItem();
    this.lastCurrent = this.current;
  }

  get collection() {
    const items = this.options().items;
    if (items === undefined) return null;
    return { items, enabled: items.filter((i) => !i.disabled), itemByName: new Map(items.map((i) => [i.name, i])) };
  }
  get shortcuts(): QuestionnaireShortcutMode | null {
    return this.options().shortcuts ?? null;
  }
  get nativeValidation() {
    return this.options().noValidate === false;
  }
  private initialItem(): string | null {
    const collection = this.collection;
    const preferred = this.options().defaultItem;
    if (collection === null) return preferred ?? null;
    const definition = preferred === undefined ? undefined : collection.itemByName.get(preferred);
    return definition !== undefined && !definition.disabled ? definition.name : (collection.enabled[0]?.name ?? null);
  }

  get controlled() {
    return this.options().item !== undefined;
  }
  get current(): string | null {
    return this.options().item ?? this.activeName;
  }
  private get enabledItems() {
    return inDocumentOrder(this.items.flatMap((i) => (i.element === null ? [] : [{ item: i, element: i.element }])))
      .map(({ item }) => item)
      .filter((i) => !i.disabled);
  }
  // The questions in order: the root's items, or those rendered.
  private get order(): { name: string }[] {
    return this.collection?.enabled ?? this.enabledItems;
  }
  private get index() {
    const current = this.current;
    return this.order.findIndex((i) => i.name === current);
  }
  get activeItem(): QuestionnaireItemEngine | null {
    const current = this.current;
    return this.index < 0 || current === null ? null : (this.enabledItems.find((i) => i.name === current) ?? null);
  }
  get total() {
    return this.order.length;
  }
  get position() {
    return this.index < 0 ? 0 : this.index + 1;
  }
  get first() {
    return this.total > 0 && this.index === 0;
  }
  get last() {
    return this.total > 0 && this.index === this.total - 1;
  }
  get activeRequired(): boolean | null {
    if (this.index < 0) return null;
    const current = this.current;
    const definition = current === null ? undefined : this.collection?.itemByName.get(current);
    return definition !== undefined ? definition.required === true : (this.activeItem?.required ?? false);
  }
  get activeStatus(): QuestionnaireItemStatus | null {
    if (this.index < 0) return null;
    return this.activeItem?.status ?? (this.current === null ? null : "unanswered");
  }
  // current, first, last, total: the root's and the progress's state.
  get state() {
    return { current: this.position, first: this.first, last: this.last, total: this.total };
  }

  // Something changed: re-render now, and settle once the change is in (as a layout effect would).
  notify = () => {
    this.change();
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.settle();
    });
  };

  registerItem = (item: QuestionnaireItemEngine) => {
    this.items = [...this.items.filter((i) => i !== item && i.name !== item.name), item];
    this.notify();
    return () => {
      this.items = this.items.filter((i) => i !== item);
      this.notify();
    };
  };

  private go(name: string, target: "item" | "invalid" = "item") {
    if (name === this.current) return;
    this.focusRequest = { name, target };
    if (!this.controlled) this.activeName = name;
    this.itemChange(name);
    this.notify();
  }

  // After a change, once mounted: a missing current question falls to the first, and the question
  // that was just moved to takes the focus.
  settle() {
    if (this.settling) return;
    this.settling = true;
    try {
      for (const item of this.items) item.settle();
      const order = this.order;
      if (order.length === 0) return;
      const current = this.current;
      if (this.index < 0) {
        if (!this.controlled && current === null) {
          this.activeName = order[0]!.name;
          this.change();
        } else this.go(order[0]!.name);
        return;
      }
      const request = this.focusRequest;
      const changed = this.lastCurrent !== current;
      this.lastCurrent = current;
      const item = this.activeItem;
      if (request === null || request.name !== current) {
        if (this.controlled && changed) {
          this.focusRequest = null;
          item?.focus();
        }
        return;
      }
      if (item === null) return;
      if (request.target === "invalid") item.focusInvalid();
      else item.focus();
      this.focusRequest = null;
    } finally {
      this.settling = false;
    }
  }

  goPrevious = () => {
    const index = this.index;
    if (index > 0) this.go(this.order[index - 1]!.name);
  };
  goNext = () => {
    const item = this.activeItem;
    const index = this.index;
    if (item === null || index >= this.total - 1) return;
    if (!item.validate()) {
      item.focusInvalid();
      return;
    }
    this.go(this.order[index + 1]!.name);
  };
  // Enter on an answer, or Cmd/Ctrl+Enter: the next question, or the form's submit on the last.
  advance = () => {
    const item = this.activeItem;
    if (item === null) return;
    if (!item.validate()) {
      item.focusInvalid();
      return;
    }
    if (this.last) this.form?.requestSubmit();
    else this.go(this.order[this.index + 1]!.name);
  };
  skipCurrent = () => {
    const item = this.activeItem;
    if (item === null || item.required) return;
    item.skip();
    if (!this.last) this.go(this.order[this.index + 1]!.name);
    else queueMicrotask(() => this.form?.requestSubmit());
  };

  // The form's reset: every answer back to its default, and the first question again.
  reset = () => {
    for (const item of this.items) item.reset();
    const collection = this.collection;
    const preferred = this.options().defaultItem;
    const name = collection !== null ? this.initialItem() : (this.enabledItems.find((i) => i.name === preferred)?.name ?? this.enabledItems[0]?.name);
    if (name !== null && name !== undefined) this.go(name);
  };
  // The form's submit: stopped at the first question that isn't answered as it must be.
  submit = (event: Event): boolean => {
    const collection = this.collection;
    const byName = new Map(this.enabledItems.map((i) => [i.name, i]));
    const ordered = collection === null ? this.enabledItems : collection.enabled.flatMap((d) => byName.get(d.name) ?? []);
    const invalid = ordered.find((item) => !item.validate());
    if (invalid === undefined) return true;
    event.preventDefault();
    this.go(invalid.name, "invalid");
    if (invalid.name === this.current) {
      invalid.focusInvalid();
      this.focusRequest = null;
    }
    return false;
  };

  keydown = (event: KeyboardEvent) => {
    const item = this.activeItem;
    const target = event.target;
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || item === null || !(target instanceof Element)) return;
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (!event.repeat) this.advance();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if ((event.key === "ArrowUp" || event.key === "ArrowDown") && item.moveAnswerFocus(target, event.key === "ArrowDown" ? "next" : "previous")) {
      event.preventDefault();
      return;
    }
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !isTextEntry(target) && !isRadio(target)) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.key === "ArrowLeft") this.goPrevious();
      else if (item.status !== "unanswered") this.goNext();
      return;
    }
    if (event.key === "Enter") {
      const answer = item.answerByElement(target);
      if (answer === null) return;
      event.preventDefault();
      if (!event.repeat && isFilled(answer)) this.advance();
      return;
    }
    const mode = this.shortcuts;
    if (mode === null || isTextEntry(target)) return;
    const key = mode === "letters" ? event.key.toUpperCase() : event.key;
    const answer = shortcutKeys(mode).includes(key) ? item.answerByShortcut(key) : null;
    if (answer === null) return;
    event.preventDefault();
    if (event.repeat) return;
    answer.element.focus();
    if (answer.type === "choice") answer.element.click();
  };
}

// A choice's state and its input's attributes, from its item and its own props.
export type QuestionnaireChoiceOptions = { value: string; checked?: boolean | undefined; defaultChecked?: boolean | undefined; disabled?: boolean | undefined };
export function choiceState(item: QuestionnaireItemEngine, id: string, options: QuestionnaireChoiceOptions) {
  const controlled = options.checked !== undefined;
  const disabled = item.disabled || (options.disabled ?? false);
  const checked = controlled ? (item.status === "skipped" ? false : options.checked === true) : item.selected.includes(id);
  const shortcut = item.shortcutByChoiceValue?.get(options.value) ?? item.shortcutByAnswerId.get(id) ?? null;
  const state = { checked, disabled, invalid: item.invalid, shortcut, type: item.multiple ? ("checkbox" as const) : ("radio" as const) };
  return {
    state,
    // The label's and the input's data attributes.
    data: { ...dataAttributes({ disabled, invalid: state.invalid, shortcut, type: state.type }), "data-checked": checked ? "" : undefined, "data-unchecked": checked ? undefined : "" },
    input: {
      "aria-invalid": state.invalid || undefined,
      "aria-keyshortcuts": answerShortcuts(shortcut, !disabled && checked),
      checked,
      disabled,
      id,
      name: item.status === "skipped" ? undefined : item.name,
      required: item.required && !item.multiple && !item.hasInputAnswer,
      type: state.type,
      value: options.value,
    },
  };
}

// The same for a typed answer: it joins the form (and has a name) only once it's answered, so an
// empty one is neither submitted nor validated.
export type QuestionnaireInputOptions = { value?: string | number | readonly string[] | undefined; disabled?: boolean | undefined; type?: QuestionnaireInputType | undefined };
export function inputState(item: QuestionnaireItemEngine, id: string, options: QuestionnaireInputOptions, filledUncontrolled: boolean) {
  const disabled = item.disabled || (options.disabled ?? false);
  const filled = options.value !== undefined ? hasValue(options.value) : filledUncontrolled;
  const answered = item.selected.includes(id);
  return {
    data: dataAttributes({ disabled, invalid: item.invalid, empty: !filled, filled }),
    input: {
      "aria-invalid": item.invalid || undefined,
      "aria-keyshortcuts": answerShortcuts(null, !disabled && filled && answered),
      disabled,
      form: answered ? undefined : "",
      id,
      name: answered ? item.name : undefined,
      type: options.type ?? "text",
    },
  };
}

// A navigation button's state: shown or not, and Enter as its shortcut when it's Next or Submit.
export function navigationState(visible: boolean, disabled: boolean, status: QuestionnaireItemStatus | null, shortcut: "Enter" | null, tabindex?: number) {
  const key = visible && !disabled ? shortcut : null;
  return {
    "aria-hidden": !visible || undefined,
    "aria-keyshortcuts": key ?? undefined,
    disabled,
    hidden: !visible,
    inert: !visible,
    tabindex: visible ? tabindex : -1,
    ...dataAttributes({ disabled, shortcut: key, status }),
    "data-hidden": visible ? undefined : "",
    "data-visible": visible ? "" : undefined,
  };
}
`;
