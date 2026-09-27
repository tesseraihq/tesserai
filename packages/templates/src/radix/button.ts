import type { Anatomy } from "@tesserai/core";
import { buttonSource } from "../button-shared";
import { NATIVE_STATES } from "../classes";

// A native button; Radix's Slot provides asChild for rendering as a link.
export function renderButton(anatomy: Anatomy): string {
  return buttonSource(anatomy, {
    states: NATIVE_STATES,
    imports: `import { Slot } from "radix-ui";`,
    props: `React.ComponentProps<"button"> & { asChild?: boolean }`,
    destructure: "asChild = false, ",
    prelude: `\n  const Comp = asChild ? Slot.Root : "button";`,
    element: "Comp",
    className: (expr) => expr,
  });
}
