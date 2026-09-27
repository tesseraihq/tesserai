import type { Anatomy } from "@tesserai/core";
import { buttonSource } from "../button-shared";
import { RAC_STATES } from "./states";

// React Aria's Button: press events that behave the same for mouse, touch and keyboard, and
// isDisabled / isPending instead of the native attributes. It is also what React Aria's
// DialogTrigger, MenuTrigger and TooltipTrigger look for as their trigger. LinkButton is a link
// that looks like a button, as in shadcn's React Aria registry.
export function renderButton(anatomy: Anatomy): string {
  return buttonSource(anatomy, {
    states: RAC_STATES,
    imports: `import { Button as ButtonPrimitive, composeRenderProps, Link, type ButtonProps as ButtonPrimitiveProps, type LinkProps } from "react-aria-components";`,
    props: "ButtonPrimitiveProps",
    element: "ButtonPrimitive",
    className: (expr) => `composeRenderProps(className, (className) => ${expr})`,
    extra: `
function LinkButton({ className, variant, intent, size = "default", children, ...props }: LinkProps & ButtonVariantProps) {
  const axes = resolveAxes({ variant, intent, size });
  return (
    <Link
      data-slot="button"
      data-variant={axes.variant}
      data-intent={axes.intent}
      data-size={size === "default" ? axes.size : size}
      className={composeRenderProps(className, (className) => buttonVariants({ variant, intent, size, className }))}
      {...props}
    >
      {label(children)}
    </Link>
  );
}
`,
    exports: ["LinkButton"],
  });
}
