import { type Anatomy } from "@tesserai/core";
import { modalClasses } from "../modal";

// shadcn's Base UI sheet: a Dialog whose popup sits on one side (right by default) and slides in.
export function renderSheet(anatomy: Anatomy): string {
  const c = modalClasses(anatomy, "sheet", "base-ui");
  return `import * as React from "react";
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props<T extends React.ElementType> = Omit<React.ComponentProps<T>, "className"> & { className?: string };

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetOverlay({ className, ...props }: Props<typeof SheetPrimitive.Backdrop>) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn(${c.backdrop}, className)} {...props} />;
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Props<typeof SheetPrimitive.Popup> & { side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Popup data-slot="sheet-content" data-side={side} className={cn(${c.popup}, className)} {...props}>
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close data-slot="sheet-close" className=${c.close}>
            <XIcon aria-hidden="true" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn(${c.header}, className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn(${c.footer}, className)} {...props} />;
}

function SheetTitle({ className, ...props }: Props<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn(${c.title}, className)} {...props} />;
}

function SheetDescription({ className, ...props }: Props<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description data-slot="sheet-description" className={cn(${c.description}, className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
`;
}
