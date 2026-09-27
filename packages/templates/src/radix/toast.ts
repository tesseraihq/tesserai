import type { Anatomy } from "@tesserai/core";
import type { StatePrefixes } from "../classes";
import { classString } from "../codegen";
import type { TemplateContext } from "../render";
import { toastParts, toastPieces } from "../toast-shared";
import { RADIX_STATES } from "./states";

const CONTENT = ["flex", "min-w-0", "flex-col", "gap-1"];
const VIEWPORT = ["fixed", "end-4", "bottom-4", "z-50", "flex", "flex-col", "gap-2", "outline-none"];

// Toast's classes, which every framework's shell prints from: the root and its icon vary by
// intent (cvas); Radix opens and closes a toast with data-state and swipes it with data-swipe and
// --radix-toast-swipe-move-x, which Reka writes as it does (under --reka-).
export function toastSlotPieces(anatomy: Anatomy, context: TemplateContext, flavor: { states: StatePrefixes; motion: string[] } = { states: RADIX_STATES, motion: ROOT_EXTRA }) {
  const p = toastParts(anatomy, context, flavor.states, flavor.motion);
  return {
    intents: p.intents,
    defaultIntent: p.defaultIntent,
    icons: p.icons,
    slots: {
      toast: p.root,
      "toast-icon": p.icon,
      "toast-content": CONTENT,
      "toast-title": p.title,
      "toast-description": p.description,
      "toast-action": p.action,
      "toast-close": p.close,
      "toast-viewport": VIEWPORT,
    },
  };
}

export const ROOT_EXTRA = [
  "data-[state=open]:animate-enter",
  "data-[state=closed]:animate-exit",
  "data-[swipe=end]:animate-exit",
  "data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)",
  "data-[swipe=cancel]:translate-x-0",
];

// Radix has no toast manager, and shadcn's Radix registry uses Sonner instead; a tiny module store
// gives Radix the same surface as the Base UI toast: toast.add() from anywhere, <Toaster />, and
// useToastManager().
export function renderToast(anatomy: Anatomy, context: TemplateContext): string {
  const p = toastPieces(anatomy, context, RADIX_STATES, ROOT_EXTRA);
  return `import * as React from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { ${["XIcon", ...p.iconImports].join(", ")} } from "lucide-react";
import { cn } from "@/lib/utils";

${p.prelude}

export type ToastOptions = {
  id?: string;
  type?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  // Milliseconds before it closes on its own.
  timeout?: number;
  actionProps?: { children: React.ReactNode; onClick?: () => void; altText?: string };
};
type ToastItem = ToastOptions & { id: string };

let items: ToastItem[] = [];
const listeners = new Set<(toasts: ToastItem[]) => void>();
let counter = 0;

function emit() {
  for (const listener of listeners) listener(items);
}

// toast.add({ title, description, type: "success", actionProps: { children: "Undo", onClick } })
// from anywhere; <Toaster /> shows them.
const toast = {
  add(options: ToastOptions): string {
    const id = options.id ?? String(++counter);
    items = [...items.filter((t) => t.id !== id), { ...options, id }];
    emit();
    return id;
  },
  close(id: string) {
    items = items.filter((t) => t.id !== id);
    emit();
  },
};

function useToastManager() {
  const [toasts, setToasts] = React.useState(items);
  React.useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);
  return { toasts, add: toast.add, close: toast.close };
}

// Mount once near the root; it may wrap the app.
function Toaster({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { toasts, close } = useToastManager();
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {toasts.map((item) => {
        const intent = intentOf(item.type);
        const Icon = icons[intent];
        return (
          <ToastPrimitive.Root
            key={item.id}
            data-slot="toast"
            data-intent={intent}
            {...(item.timeout === undefined ? {} : { duration: item.timeout })}
            onOpenChange={(open) => {
              if (!open) close(item.id);
            }}
            className={toastVariants({ intent })}
          >
            <span data-slot="toast-icon" className={toastIconVariants({ intent })}>{Icon ? <Icon aria-hidden="true" /> : null}</span>
            <div data-slot="toast-content" className=${classString(CONTENT)}>
              {item.title !== undefined ? <ToastPrimitive.Title data-slot="toast-title" className=${p.title}>{item.title}</ToastPrimitive.Title> : null}
              {item.description !== undefined ? <ToastPrimitive.Description data-slot="toast-description" className=${p.description}>{item.description}</ToastPrimitive.Description> : null}
            </div>
            {item.actionProps ? (
              <ToastPrimitive.Action
                data-slot="toast-action"
                altText={item.actionProps.altText ?? (typeof item.actionProps.children === "string" ? item.actionProps.children : "Action")}
                onClick={item.actionProps.onClick}
                className=${p.action}
              >
                {item.actionProps.children}
              </ToastPrimitive.Action>
            ) : (
              <span />
            )}
            <ToastPrimitive.Close data-slot="toast-close" aria-label="Close" className=${p.close}>
              <XIcon aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport data-slot="toast-viewport" className={cn(${classString(VIEWPORT)}, className)} />
    </ToastPrimitive.Provider>
  );
}

export { Toaster, toast, useToastManager, toastVariants };
export type ToastVariants = VariantProps<typeof toastVariants>;
`;
}
