import { type Anatomy } from "@tesserai/core";
import { racModalSource } from "./modal";

export function renderSheet(anatomy: Anatomy): string {
  const { classes: c, overlay } = racModalSource(anatomy, "sheet");
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

function SheetTrigger(props: DialogTriggerProps) {
  return <DialogTriggerPrimitive {...props} />;
}

function SheetClose(props: ButtonProps) {
  return <Button slot="close" data-slot="sheet-close" {...props} />;
}

function Sheet({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Omit<ModalOverlayProps, "className" | "children"> & { className?: string; children: React.ReactNode; side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean }) {
  return (
    <ModalOverlay data-slot="sheet-overlay" isDismissable className=${overlay} {...props}>
      <Modal data-slot="sheet-content" data-side={side} className={cn(${c.popup}, className)}>
        <DialogPrimitive data-slot="sheet" className="relative flex h-full flex-col outline-none">
          {children}
          {showCloseButton ? (
            <Button slot="close" data-slot="sheet-close" className=${c.close}>
              <XIcon aria-hidden="true" />
              <span className="sr-only">Close</span>
            </Button>
          ) : null}
        </DialogPrimitive>
      </Modal>
    </ModalOverlay>
  );
}

// shadcn's React Aria sheet keeps SheetContent as an alias of Sheet.
const SheetContent = Sheet;

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn(${c.header}, className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn(${c.footer}, className)} {...props} />;
}

function SheetTitle({ className, ...props }: HeadingProps) {
  return <Heading slot="title" data-slot="sheet-title" className={cn(${c.title}, className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-description" className={cn(${c.description}, className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
`;
}
