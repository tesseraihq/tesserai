import type { ReactElement } from "react";
import type { VNode } from "vue";

// One element tree, built for both frameworks: the same parts (by export name) with the same props,
// React's spelling of a prop or Vue's where they differ (className and class; checked and
// modelValue), and the same children.

export type Props = Record<string, unknown>;
export type Tree = { part: string; props: Props; react: Props; vue: Props; children: Child[] };
export type Child = Tree | string;

// n("Checkbox", { size: "sm" }, …children); a lowercase part is a plain element.
export function n(part: string, props: Props = {}, ...children: Child[]): Tree {
  return { part, props, react: {}, vue: {}, children };
}

// The same, with props spelled differently in each framework: { react: { checked: true }, vue: { modelValue: true } }.
export function nx(part: string, props: { both?: Props; react?: Props; vue?: Props }, ...children: Child[]): Tree {
  return { part, props: props.both ?? {}, react: props.react ?? {}, vue: props.vue ?? {}, children };
}

type Builders = {
  createElement: (type: unknown, props?: unknown, ...children: unknown[]) => ReactElement;
  h: (type: unknown, props?: unknown, children?: unknown) => VNode;
};

const isElement = (part: string) => /^[a-z]/.test(part);

// React takes className; everything else is the same prop in both.
export const reactProps = ({ class: className, ...props }: Props) => (className === undefined ? props : { ...props, className });

export function toReact(tree: Child, parts: Record<string, unknown>, { createElement }: Builders): unknown {
  if (typeof tree === "string") return tree;
  const type = isElement(tree.part) ? tree.part : parts[tree.part];
  if (type === undefined) throw new Error(`React has no ${tree.part}`);
  return createElement(type, { ...reactProps(tree.props), ...tree.react }, ...tree.children.map((c) => toReact(c, parts, { createElement } as Builders)));
}

export function toVue(tree: Child, parts: Record<string, unknown>, builders: Builders): unknown {
  if (typeof tree === "string") return tree;
  const children = () => tree.children.map((c) => toVue(c, parts, builders));
  if (isElement(tree.part)) return builders.h(tree.part, { ...tree.props, ...tree.vue }, children());
  const type = parts[tree.part];
  if (type === undefined) throw new Error(`Vue has no ${tree.part}`);
  return builders.h(type, { ...tree.props, ...tree.vue }, tree.children.length === 0 ? undefined : { default: children });
}
