// Single-line controls (Button, Toggle, a tab, Badge, a date picker's trigger) never grow past the
// room they're given: a label too long for it ends in an ellipsis. text-overflow needs a block box
// to end, and a flex box's own text has none, so the label is a span, which these classes let
// shrink and truncate; the control itself may shrink (min-w-0) and never outgrows its container
// (max-w-full). React's controls put bare text in a span themselves (TEXT_IN_SPAN). A Vue slot or a
// Svelte snippet can't be looked into, so there a label that should truncate is written in a
// <span>, as shadcn's sidebar asks of its menu buttons.
export const SHRINKS = ["min-w-0", "max-w-full"];
export const LABEL_TRUNCATES = ["[&>span]:min-w-0", "[&>span]:truncate"];

// Prints `label(children)`: a string or number child in a span, anything else (elements, a render
// function, whitespace between elements) as it was, so asChild's single child still reaches Slot.
// (The printed comment avoids words that are also utility classes: a prefixing check reads them.)
export const TEXT_IN_SPAN = `// Text goes in a span, which ends in an ellipsis when the control has no room for it; text set
// straight in the control can't be shortened.
function label<T>(children: T): T {
  const wrap = (child: unknown) => (typeof child === "number" || (typeof child === "string" && child.trim() !== "") ? <span>{child}</span> : child);
  return (Array.isArray(children) ? React.Children.map(children, wrap) : wrap(children)) as T;
}`;
