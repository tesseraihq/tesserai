import { type Anatomy } from "@tesserai/core";
import { racModalSource } from "./modal";

export function renderDialog(anatomy: Anatomy): string {
  const { classes: c, overlay } = racModalSource(anatomy, "dialog");
  return `import * as React from "react";
import {
  Button,
  Dialog as DialogPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  Heading,
  Modal,
  ModalOverlay,
  type ButtonProps,
  type DialogTriggerProps,
  type HeadingProps,
  type ModalOverlayProps,
} from "react-aria-components";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function DialogTrigger(props: DialogTriggerProps) {
  return <DialogTriggerPrimitive {...props} />;
}

// Any Button with slot="close" closes the dialog; this one is unstyled.
function DialogClose(props: ButtonProps) {
  return <Button slot="close" data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, children, ...props }: Omit<ModalOverlayProps, "className" | "children"> & { className?: string; children: React.ReactNode }) {
  return (
    <ModalOverlay data-slot="dialog-overlay" className={cn(${overlay}, className)} {...props}>
      {children}
    </ModalOverlay>
  );
}

function Dialog({
  className,
  children,
  showCloseButton = true,
  isDismissable = true,
  ...props
}: Omit<ModalOverlayProps, "className" | "children"> & { className?: string; children: React.ReactNode; showCloseButton?: boolean }) {
  return (
    <DialogOverlay isDismissable={isDismissable} {...props}>
      <Modal data-slot="dialog-content" className="w-full outline-none">
        <DialogPrimitive data-slot="dialog" className={cn(${c.popup}, "relative mx-auto", className)}>
          {children}
          {showCloseButton ? (
            <Button slot="close" data-slot="dialog-close" className=${c.close}>
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Button>
          ) : null}
        </DialogPrimitive>
      </Modal>
    </DialogOverlay>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn(${c.header}, className)} {...props} />;
}

function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn(${c.footer}, className)} {...props}>
      {children}
      {showCloseButton ? <DialogClose>Close</DialogClose> : null}
    </div>
  );
}

function DialogTitle({ className, ...props }: HeadingProps) {
  return <Heading slot="title" data-slot="dialog-title" className={cn(${c.title}, className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-description" className={cn(${c.description}, className)} {...props} />;
}

export { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle, DialogTrigger };
`;
}
