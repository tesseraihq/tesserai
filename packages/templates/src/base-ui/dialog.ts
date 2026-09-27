import { type Anatomy } from "@tesserai/core";
import { modalClasses } from "../modal";

// shadcn's Base UI dialog: Content is Portal > Overlay + Popup, with a close button unless
// showCloseButton is false. The footer can add a close button too.
export function renderDialog(anatomy: Anatomy): string {
  const c = modalClasses(anatomy, "dialog", "base-ui");
  return `import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string };

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: Props<typeof DialogPrimitive.Backdrop>) {
  return <DialogPrimitive.Backdrop data-slot="dialog-overlay" className={cn(${c.backdrop}, className)} {...props} />;
}

function DialogContent({ className, children, showCloseButton = true, ...props }: Props<typeof DialogPrimitive.Popup> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup data-slot="dialog-content" className={cn(${c.popup}, className)} {...props}>
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close data-slot="dialog-close" className=${c.close}>
            <XIcon aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn(${c.header}, className)} {...props} />;
}

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn(${c.footer}, className)} {...props}>
      {children}
      {showCloseButton ? <DialogPrimitive.Close>Close</DialogPrimitive.Close> : null}
    </div>
  );
}

function DialogTitle({ className, ...props }: Props<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn(${c.title}, className)} {...props} />;
}

function DialogDescription({ className, ...props }: Props<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn(${c.description}, className)} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
`;
}
