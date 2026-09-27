import type { StatePrefixes } from "../classes";

// Radix exposes state through data-state and data-* attributes; native elements keep pseudo-classes.
export const RADIX_STATES: StatePrefixes = {
  hover: ["hover:"],
  "focus-visible": ["focus-visible:"],
  pressed: ["active:"],
  disabled: ["data-[disabled]:"],
  invalid: ["aria-invalid:"],
  selected: ["data-[state=checked]:"],
  highlighted: ["data-[highlighted]:"],
  "read-only": ["read-only:"],
  loading: ["data-loading:"],
  open: ["data-[state=open]:"],
  indeterminate: ["data-[state=indeterminate]:"],
  current: ["aria-[current=page]:"],
  // Radix marks no dragging state; the thumb is :active while held.
  dragging: ["active:"],
  placeholder: ["data-placeholder:"],
  horizontal: ["data-[orientation=horizontal]:"],
  vertical: ["data-[orientation=vertical]:"],
};
