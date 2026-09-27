import { type Anatomy } from "@tesserai/core";
import { textareaClasses } from "../base-ui/textarea";
import { classString } from "../codegen";
import { RAC_STATES } from "./states";

// Like React Aria's Input: data-invalid and data-disabled are managed; read-only stays native.
const TEXTAREA_STATES = { ...RAC_STATES, "read-only": ["read-only:"] };

export function renderTextarea(anatomy: Anatomy): string {
  return `import * as React from "react";
import { composeRenderProps, TextArea as TextAreaPrimitive, type TextAreaProps } from "react-aria-components";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: TextAreaProps) {
  return (
    <TextAreaPrimitive
      data-slot="textarea"
      className={composeRenderProps(className, (className) => cn(${classString(textareaClasses(anatomy, TEXTAREA_STATES))}, className))}
      {...props}
    />
  );
}

export { Textarea };
`;
}
