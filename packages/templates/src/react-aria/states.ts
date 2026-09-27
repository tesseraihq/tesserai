import { mapStates, type StatePrefixes } from "../classes";

// React Aria reports interaction state as data attributes it manages itself (data-hovered only on
// real pointer hover, data-focus-visible only for keyboard focus, data-pressed through its press
// events), so every state maps to one of them. Highlighted is keyboard or pointer focus in a
// collection (menu and listbox items), which React Aria calls data-focused.
export const RAC_STATES: StatePrefixes = {
  hover: ["data-hovered:"],
  "focus-visible": ["data-focus-visible:"],
  pressed: ["data-pressed:"],
  disabled: ["data-disabled:"],
  invalid: ["data-invalid:"],
  selected: ["data-selected:"],
  highlighted: ["data-focused:"],
  "read-only": ["data-readonly:"],
  loading: ["data-pending:"],
  // Disclosures say data-expanded; a template overrides this for popups and pickers (data-open).
  open: ["data-expanded:"],
  indeterminate: ["data-indeterminate:"],
  current: ["data-current:"],
  dragging: ["data-dragging:"],
  placeholder: ["data-placeholder:"],
  horizontal: ["data-[orientation=horizontal]:"],
  vertical: ["data-[orientation=vertical]:"],
};

// For an element styled from its React Aria ancestor, which is marked with the `group` class.
export function groupStates(states: StatePrefixes): StatePrefixes {
  return mapStates((state) => states[state].map((p) => `group-${p}`));
}
