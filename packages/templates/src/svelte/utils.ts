// A Svelte project's lib/utils.ts: the same cn as React's (clsx and tailwind-merge told the system's
// type steps, which is why it isn't shadcn-svelte's `cn` package or tailwind-variants' merge), plus
// the prop helpers shadcn-svelte's components import from it: a bindable element ref, and Bits UI
// props without their child or children snippets. Existing shadcn-svelte components keep compiling.
// `unknown` where shadcn-svelte writes `any` (the same types), so no eslint-disable comment names a
// rule the project's linter may not load, which ESLint reports as an error.
export function svelteUtilsSource(utils: string): string {
  return `${utils}
export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, "child"> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
`;
}
