import type { Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import type { TemplateContext } from "../render";
import { toastPieces } from "../toast-shared";

const ROOT_EXTRA = ["data-starting-style:opacity-0", "data-starting-style:translate-y-2", "data-ending-style:opacity-0"];

// Base UI's own toast, as in shadcn: a toast manager you can call from anywhere, a Toaster that
// provides and shows it, and the parts for building a different layout.
export function renderToast(anatomy: Anatomy, context: TemplateContext): string {
  const p = toastPieces(anatomy, context, BASE_UI_STATES, ROOT_EXTRA);
  return `import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { cva, type VariantProps } from "class-variance-authority";
import { ${["XIcon", ...p.iconImports].join(", ")} } from "lucide-react";
import { cn } from "@/lib/utils";

${p.prelude}

type ClassName = { className?: string | undefined };

// toast.add({ title, description, type: "success", actionProps: { children: "Undo", onClick } })
// from anywhere; <Toaster /> shows them.
const toast = ToastPrimitive.createToastManager();
const createToastManager = ToastPrimitive.createToastManager;
const useToastManager = ToastPrimitive.useToastManager;
const ToastProvider = ToastPrimitive.Provider;

function ToastPortal(props: React.ComponentProps<typeof ToastPrimitive.Portal>) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />;
}

function ToastViewport({ className, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Viewport>, "className"> & ClassName) {
  return <ToastPrimitive.Viewport data-slot="toast-viewport" className={cn("fixed end-4 bottom-4 z-50 flex flex-col gap-2 outline-none", className)} {...props} />;
}

function Toast({ className, intent, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Root>, "className"> & ClassName & { intent?: Intent }) {
  const resolved = intent ?? intentOf(props.toast.type);
  return <ToastPrimitive.Root data-slot="toast" data-intent={resolved} className={cn(toastVariants({ intent: resolved }), className)} {...props} />;
}

function ToastIcon({ intent }: { intent: Intent }) {
  const Icon = icons[intent];
  return <span data-slot="toast-icon" className={toastIconVariants({ intent })}>{Icon ? <Icon aria-hidden="true" /> : null}</span>;
}

function ToastContent({ className, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Content>, "className"> & ClassName) {
  return <ToastPrimitive.Content data-slot="toast-content" className={cn("flex min-w-0 flex-col gap-1", className)} {...props} />;
}

function ToastTitle({ className, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Title>, "className"> & ClassName) {
  return <ToastPrimitive.Title data-slot="toast-title" className={cn(${p.title}, className)} {...props} />;
}

function ToastDescription({ className, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Description>, "className"> & ClassName) {
  return <ToastPrimitive.Description data-slot="toast-description" className={cn(${p.description}, className)} {...props} />;
}

// Renders the toast's actionProps when it has them.
function ToastAction({ className, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Action>, "className"> & ClassName) {
  return <ToastPrimitive.Action data-slot="toast-action" className={cn(${p.action}, className)} {...props} />;
}

function ToastClose({ className, children, ...props }: Omit<React.ComponentProps<typeof ToastPrimitive.Close>, "className"> & ClassName) {
  return (
    <ToastPrimitive.Close data-slot="toast-close" aria-label="Close" className={cn(${p.close}, className)} {...props}>
      {children ?? <XIcon aria-hidden="true" />}
    </ToastPrimitive.Close>
  );
}

function ToastList() {
  const { toasts, close } = useToastManager();
  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastIcon intent={intentOf(item.type)} />
      <ToastContent>
        <ToastTitle />
        <ToastDescription />
      </ToastContent>
      {/* Acting on a toast dismisses it, as Radix's and React Aria's do. */}
      {item.actionProps ? <ToastAction onClick={() => close(item.id)} /> : <span />}
      <ToastClose />
    </Toast>
  ));
}

// Mount once near the root (it may wrap the app, so useToastManager works inside it).
function Toaster({
  toastManager = toast,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ToastPrimitive.Provider>, "toastManager"> & ClassName & { toastManager?: ReturnType<typeof createToastManager> }) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastPortal>
        <ToastViewport className={className}>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
  toastVariants,
};
export type ToastVariants = VariantProps<typeof toastVariants>;
`;
}
