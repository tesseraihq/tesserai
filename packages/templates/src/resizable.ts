import type { Anatomy } from "@tesserai/core";
import { NATIVE_STATES } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// How each library marks a group laid out top to bottom: react-resizable-panels says so with
// aria-orientation (the group's on the group, the handle's own, across, on the handle); Reka's
// Splitter and paneforge write the group's direction on both.
export type ResizableMarks = { group: string; handle: string };
export const RESIZABLE_MARKS = {
  react: { group: "aria-[orientation=vertical]", handle: "aria-[orientation=horizontal]" },
  reka: { group: "data-[orientation=vertical]", handle: "data-[orientation=vertical]" },
  paneforge: { group: "data-[direction=vertical]", handle: "data-[direction=vertical]" },
} satisfies Record<string, ResizableMarks>;

// Resizable's classes, which every framework's shell prints from, for a library's marks.
export function resizablePieces(anatomy: Anatomy, marks: ResizableMarks = RESIZABLE_MARKS.react) {
  const v = marks.handle;
  return {
    slots: {
      // A panel's size is set from outside (dragging), so a word longer than it breaks
      // (wrap-anywhere, inherited by every panel's content).
      "resizable-panel-group": ["flex", "h-full", "w-full", "wrap-anywhere", `${marks.group}:flex-col`],
      "resizable-handle": flatClasses(anatomy, "handle", { states: NATIVE_STATES }, [
        "relative",
        "flex",
        "w-(--border-width)",
        "items-center",
        "justify-center",
        "outline-none",
        // A wider invisible strip to grab.
        "after:absolute",
        "after:inset-y-0",
        "after:left-1/2",
        "after:w-1",
        "after:-translate-x-1/2",
        `${v}:h-(--border-width)`,
        `${v}:w-full`,
        `${v}:after:left-0`,
        `${v}:after:h-1`,
        `${v}:after:w-full`,
        `${v}:after:translate-x-0`,
        `${v}:after:-translate-y-1/2`,
        `[&[${v.replace(/\[|\]/g, "")}]>div]:rotate-90`,
      ]),
      "resizable-handle:grip": flatClasses(anatomy, "grip", { states: NATIVE_STATES }, ["z-10", "flex", "w-1", "shrink-0"]),
    },
  };
}

// Resizable panels on react-resizable-panels, the same file on every library as in shadcn.
export function renderResizable(anatomy: Anatomy): string {
  const { slots } = resizablePieces(anatomy);
  const handle = slots["resizable-handle"];
  const grip = slots["resizable-handle:grip"];
  return `import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({ className, ...props }: ResizablePrimitive.GroupProps) {
  return <ResizablePrimitive.Group data-slot="resizable-panel-group" className={cn(${classString(slots["resizable-panel-group"])}, className)} {...props} />;
}

function ResizablePanel(props: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

// withHandle shows a grip on the divider.
function ResizableHandle({ withHandle, className, ...props }: ResizablePrimitive.SeparatorProps & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator data-slot="resizable-handle" className={cn(${classString(handle)}, className)} {...props}>
      {withHandle && <div className=${classString(grip)} />}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
`;
}
