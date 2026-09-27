import type { Anatomy } from "@tesserai/core";
import { buttonSource } from "../button-shared";
import { BASE_UI_STATES } from "../classes";

// Base UI's Button; render={<a href="…" />} with nativeButton={false} makes it a link.
export function renderButton(anatomy: Anatomy): string {
  return buttonSource(anatomy, {
    states: BASE_UI_STATES,
    imports: `import { Button as ButtonPrimitive } from "@base-ui/react/button";`,
    props: `Omit<React.ComponentProps<typeof ButtonPrimitive>, "className"> & { className?: string | undefined }`,
    element: "ButtonPrimitive",
    className: (expr) => expr,
  });
}
