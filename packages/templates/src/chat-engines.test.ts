import ts from "typescript";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MESSAGE_SCROLLER_ENGINE } from "./chat-engines";

// The message scroller's engine (emitted into the Vue and Svelte folders as engine.ts), run against
// stand-in elements: a viewport with a scroll position and a content whose one message ends where
// the test says. Enough of the DOM for the engine's scrolling decisions, none of a browser's layout.

type Engine = {
  setViewport(element: unknown): void;
  setContent(element: unknown): void;
  syncAfterScroll(): void;
  userScrollIntent(): void;
  handleResize(): void;
};

const saved: Record<string, unknown> = {};
let MessageScrollerEngine: new (props: () => Record<string, unknown>) => Engine;

class FakeElement {
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string) {
    this.attributes.delete(name);
  }
  toggleAttribute(name: string, on: boolean) {
    if (on) this.attributes.set(name, "");
    else this.attributes.delete(name);
  }
}

beforeAll(() => {
  for (const key of ["window", "HTMLElement"]) saved[key] = (globalThis as Record<string, unknown>)[key];
  Object.assign(globalThis, {
    HTMLElement: FakeElement,
    window: {
      getComputedStyle: () => ({ paddingTop: "0", paddingBottom: "0", rowGap: "0", gap: "0" }),
      requestAnimationFrame: (callback: (time: number) => void) => {
        callback(0);
        return 1;
      },
      cancelAnimationFrame: () => {},
    },
  });
  // Compiled to CommonJS and run in place: the engine is a module of plain TypeScript.
  const js = ts.transpileModule(MESSAGE_SCROLLER_ENGINE, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports: { MessageScrollerEngine?: typeof MessageScrollerEngine } = {};
  new Function("exports", js)(exports);
  MessageScrollerEngine = exports.MessageScrollerEngine!;
});

afterAll(() => Object.assign(globalThis, saved));

// A conversation of `height` pixels in a 100px viewport.
function conversation(height: number) {
  const viewport = Object.assign(new FakeElement(), {
    scrollTop: 0,
    clientHeight: 100,
    scrollHeight: height,
    getBoundingClientRect: () => ({ top: 0 }),
    scrollTo({ top }: { top: number }) {
      viewport.scrollTop = Math.min(top, viewport.scrollHeight - viewport.clientHeight);
    },
  });
  const message = Object.assign(new FakeElement(), { getBoundingClientRect: () => ({ top: 0, bottom: viewport.scrollHeight - viewport.scrollTop }) });
  const content = { children: [message] };
  return { viewport, content };
}

describe("the message scroller's engine", () => {
  it("doesn't take a reader back to the end while they scroll up from it", () => {
    // WebKit scrolls Home and PageUp smoothly, so the first scroll events still land within a few
    // pixels of the end; off-screen messages (content-visibility: auto) then resize as they're drawn.
    // Following again at that first event snapped the reader back to the end on the next resize.
    const { viewport, content } = conversation(1000);
    const engine = new MessageScrollerEngine(() => ({ autoScroll: true }));
    engine.setViewport(viewport);
    engine.setContent(content);
    viewport.scrollTop = 900;
    engine.syncAfterScroll();

    engine.userScrollIntent();
    viewport.scrollTop = 895;
    engine.syncAfterScroll();
    engine.handleResize();
    expect(viewport.scrollTop).toBe(895);
  });

  it("follows again once the reader scrolls back down to the end", () => {
    const { viewport, content } = conversation(1000);
    const engine = new MessageScrollerEngine(() => ({ autoScroll: true }));
    engine.setViewport(viewport);
    engine.setContent(content);
    viewport.scrollTop = 900;
    engine.syncAfterScroll();
    engine.userScrollIntent();
    viewport.scrollTop = 500;
    engine.syncAfterScroll();
    viewport.scrollTop = 900;
    engine.syncAfterScroll();
    // A new message: followed.
    viewport.scrollHeight = 1100;
    engine.handleResize();
    expect(viewport.scrollTop).toBe(1000);
  });
});
