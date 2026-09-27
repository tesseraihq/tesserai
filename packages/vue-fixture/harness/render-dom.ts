import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { createApp, h, nextTick, type VNode } from "vue";

// Mounting into the DOM for both frameworks, loaded through a "dom" loader after the test has
// put a DOM (happy-dom) on globalThis. Each returns an unmount. Portals land in document.body.
export { createElement, h };

export async function mountReact(element: ReactElement): Promise<() => Promise<void>> {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  await act(async () => root.render(element));
  return async () => {
    await act(async () => root.unmount());
    container.remove();
  };
}

// Resolves once nothing in the document has changed for about two frames, or after a second.
async function settled(): Promise<void> {
  let changed = true;
  const observer = new MutationObserver(() => (changed = true));
  observer.observe(document.body, { subtree: true, childList: true, attributes: true });
  for (let i = 0; i < 30 && changed; i++) {
    changed = false;
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 32));
  }
  observer.disconnect();
}

// Something the page does (a right-click, toast.add) while a tree is mounted, and what each
// framework does after it: React's inside act, Vue's over a couple of ticks as mountVue waits.
export async function actReact(fn: () => void): Promise<void> {
  await act(async () => fn());
}

export async function actVue(fn: () => void): Promise<void> {
  fn();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

export async function mountVue(render: () => VNode): Promise<() => Promise<void>> {
  const container = document.body.appendChild(document.createElement("div"));
  const app = createApp({ render });
  app.mount(container);
  // Reka's portal renders once mounted, and its presence settles a tick or an animation frame
  // later (later still on a busy machine): read once the page has stopped changing.
  await settled();
  return async () => {
    app.unmount();
    container.remove();
    await nextTick();
  };
}

// A click, and what it changes rendered: React inside act; Vue after its next tick, and the one
// after Reka's presence settles (a checkbox's indicator leaving).
export async function clickReact(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
}

export async function clickVue(element: HTMLElement): Promise<void> {
  element.click();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
