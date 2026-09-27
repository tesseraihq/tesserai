import { type Anatomy } from "@tesserai/core";
import { modalClasses } from "../modal";

// shadcn's Base UI alert dialog: Action is a Button (it does not close by itself; the caller
// closes after acting), Cancel is the primitive's Close rendered as an outline Button.
export function renderAlertDialog(anatomy: Anatomy): string {
  const c = modalClasses(anatomy, "alert-dialog", "base-ui");
  return `import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cva } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string };

${c.popupCva}

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({ className, ...props }: Props<typeof AlertDialogPrimitive.Backdrop>) {
  return <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={cn(${c.backdrop}, className)} {...props} />;
}

function AlertDialogContent({ className, size = ${c.defaultSize}, ...props }: Props<typeof AlertDialogPrimitive.Popup> & { size?: ${c.sizes} }) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup data-slot="alert-dialog-content" data-size={size} className={cn(alertDialogContentVariants({ size }), className)} {...props} />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={cn(${c.header}, className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={cn(${c.footer}, className)} {...props} />;
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-media" className={cn(${c.media}, className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: Props<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(${c.title}, className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: Props<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(${c.description}, className)} {...props} />;
}

function AlertDialogAction(props: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" {...props} />;
}

function AlertDialogCancel({ variant = "outline", ...props }: React.ComponentProps<typeof Button>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button variant={variant} {...props} />} />;
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
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
`;
}
