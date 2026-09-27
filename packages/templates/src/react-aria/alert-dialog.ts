import { type Anatomy } from "@tesserai/core";
import { racModalSource } from "./modal";

// Action and Cancel are the system's Buttons with slot="close", as in shadcn.
export function renderAlertDialog(anatomy: Anatomy): string {
  const { classes: c, overlay } = racModalSource(anatomy, "alert-dialog");
  return `import * as React from "react";
import {
  Dialog as DialogPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
  Heading,
  Modal,
  ModalOverlay,
  type DialogTriggerProps,
  type HeadingProps,
  type ModalOverlayProps,
} from "react-aria-components";
import { cva } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

${c.popupCva}

function AlertDialogTrigger(props: DialogTriggerProps) {
  return <DialogTriggerPrimitive {...props} />;
}

function AlertDialogOverlay({ className, children, ...props }: Omit<ModalOverlayProps, "className" | "children"> & { className?: string; children: React.ReactNode }) {
  return (
    <ModalOverlay data-slot="alert-dialog-overlay" className={cn(${overlay}, className)} {...props}>
      {children}
    </ModalOverlay>
  );
}

function AlertDialog({ className, children, size = ${c.defaultSize}, ...props }: Omit<ModalOverlayProps, "className" | "children"> & { className?: string; children: React.ReactNode; size?: ${c.sizes} }) {
  return (
    <AlertDialogOverlay {...props}>
      <Modal data-slot="alert-dialog-content" data-size={size} className="w-full outline-none">
        <DialogPrimitive role="alertdialog" data-slot="alert-dialog" className={cn(alertDialogContentVariants({ size }), "relative mx-auto", className)}>
          {children}
        </DialogPrimitive>
      </Modal>
    </AlertDialogOverlay>
  );
}

// shadcn's React Aria alert dialog has no separate content part; this alias keeps Base UI and Radix
// code working.
const AlertDialogContent = AlertDialog;

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn(${c.header}, className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn(${c.footer}, className)} {...props} />;
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-media" className={cn(${c.media}, className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: HeadingProps) {
  return <Heading slot="title" data-slot="alert-dialog-title" className={cn(${c.title}, className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-description" className={cn(${c.description}, className)} {...props} />;
}

function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button slot="close" data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({ variant = "outline", ...props }: React.ComponentProps<typeof Button>) {
  return <Button slot="close" data-slot="alert-dialog-cancel" variant={variant} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogTrigger,
};
`;
}
