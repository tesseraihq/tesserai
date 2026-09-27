import type { Anatomy } from "@tesserai/core";
import type { TemplateContext } from "../render";
import { toastPieces } from "../toast-shared";
import { RAC_STATES } from "./states";

// React Aria's toast region and queue: landmark navigation (F6), focus management and pausing on
// hover come from the library. It is exported as UNSTABLE_ in 1.21; the version is pinned and the
// generated code is type-checked against it, so a rename fails the tests rather than a user's build.
// The surface matches the Base UI toast: toast.add() from anywhere, <Toaster />, useToastManager().
export function renderToast(anatomy: Anatomy, context: TemplateContext): string {
  const p = toastPieces(anatomy, context, RAC_STATES, ["outline-none", "animate-enter"]);
  return `import * as React from "react";
import {
  Button as ButtonPrimitive,
  Text,
  UNSTABLE_Toast as ToastPrimitive,
  UNSTABLE_ToastContent as ToastContentPrimitive,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from "react-aria-components";
import { cva, type VariantProps } from "class-variance-authority";
import { ${["XIcon", ...p.iconImports].join(", ")} } from "lucide-react";
import { cn } from "@/lib/utils";

${p.prelude}

export type ToastOptions = {
  type?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  // Milliseconds before it closes on its own.
  timeout?: number;
  actionProps?: { children: React.ReactNode; onClick?: () => void };
};
type ToastItem = Omit<ToastOptions, "timeout">;

const queue = new ToastQueue<ToastItem>({ maxVisibleToasts: 5 });

// toast.add({ title, description, type: "success", actionProps: { children: "Undo", onClick } })
// from anywhere; <Toaster /> shows them.
const toast = {
  add({ timeout, ...content }: ToastOptions): string {
    return queue.add(content, timeout === undefined ? {} : { timeout });
  },
  close(key: string) {
    queue.close(key);
  },
};

function useToastManager() {
  return toast;
}

// Mount once near the root; it may wrap the app.
function Toaster({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastRegion queue={queue} data-slot="toast-viewport" className={cn("fixed end-4 bottom-4 z-50 flex flex-col gap-2 outline-none", className)}>
        {({ toast: item }) => {
          const intent = intentOf(item.content.type);
          const Icon = icons[intent];
          const action = item.content.actionProps;
          return (
            <ToastPrimitive toast={item} data-slot="toast" data-intent={intent} className={toastVariants({ intent })}>
              <span data-slot="toast-icon" className={toastIconVariants({ intent })}>{Icon ? <Icon aria-hidden="true" /> : null}</span>
              <ToastContentPrimitive data-slot="toast-content" className="flex min-w-0 flex-col gap-1">
                {item.content.title !== undefined ? <Text slot="title" data-slot="toast-title" className=${p.title}>{item.content.title}</Text> : null}
                {item.content.description !== undefined ? <Text slot="description" data-slot="toast-description" className=${p.description}>{item.content.description}</Text> : null}
              </ToastContentPrimitive>
              {action ? (
                <ButtonPrimitive
                  data-slot="toast-action"
                  onPress={() => {
                    action.onClick?.();
                    queue.close(item.key);
                  }}
                  className=${p.action}
                >
                  {action.children}
                </ButtonPrimitive>
              ) : (
                <span />
              )}
              <ButtonPrimitive slot="close" data-slot="toast-close" aria-label="Close" className=${p.close}>
                <XIcon aria-hidden="true" />
              </ButtonPrimitive>
            </ToastPrimitive>
          );
        }}
      </ToastRegion>
    </>
  );
}

export { Toaster, toast, useToastManager, toastVariants };
export type ToastVariants = VariantProps<typeof toastVariants>;
`;
}
