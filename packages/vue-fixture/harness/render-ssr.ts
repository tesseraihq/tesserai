import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSSRApp, h, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";

// Server rendering for both frameworks, loaded through a "ssr" loader so the React and Vue that
// render are the ones the generated components import.
export { createElement, h };

export function renderReact(element: ReactElement): string {
  return renderToStaticMarkup(element);
}

export function renderVue(render: () => VNode): Promise<string> {
  return renderToString(createSSRApp({ render }));
}
