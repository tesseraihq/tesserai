import type { CalendarCellStates, CalendarStates } from "../calendar";
import type { StatePrefixes } from "../classes";
import { renameRadixVarsForBits } from "../css-vars";
import { RADIX_POPUP_MOTION } from "../popup-shared";
import { RADIX_STATES } from "../radix/states";

// Bits UI is Radix-shaped: checked against bits-ui 2.19.3's build, its parts carry the same
// data-state values (open/closed, checked/unchecked/indeterminate, active/inactive, on/off),
// data-disabled, data-highlighted, data-orientation and data-placeholder, so every abstract state
// maps to Radix's prefix. Where a Bits part differs (select items say data-selected, not
// data-state=checked), its template overrides the one state, as the React templates do.
export const BITS_STATES: StatePrefixes = { ...RADIX_STATES };

// Floating popups keep Radix's keyframe motion: Bits sets data-state=open/closed on them and waits
// for getAnimations() before unmounting, so the same classes animate the same way. Only the origin
// variable is Bits' own (--bits-popover-content-transform-origin, and so on for each popup).
export const BITS_POPUP_MOTION = RADIX_POPUP_MOTION.map(renameRadixVarsForBits);

// A component's pieces with Radix's CSS variables renamed to Bits' (a popup's transform origin, a
// disclosure's content height), every class list and cva in them.
export function bitsVars<T>(pieces: T): T {
  if (typeof pieces === "string") return renameRadixVarsForBits(pieces) as T;
  if (Array.isArray(pieces)) return pieces.map(bitsVars) as T;
  if (typeof pieces === "object" && pieces !== null) return Object.fromEntries(Object.entries(pieces).map(([k, v]) => [k, bitsVars(v)])) as T;
  return pieces;
}

// Bits' calendar marks a day's state on the day and on its cell alike: data-selected, data-today,
// data-outside-month, data-disabled, and on a range calendar's data-range-start, data-range-end and
// data-range-middle (the range's own days). A cell also says aria-selected. Focus is the day
// button's own. See calendar.ts's CalendarStates for what each prefix does.
const BITS_CALENDAR_DAY: CalendarStates = {
  dayFocus: "focus-visible:",
  selected: ["data-selected:"],
  rangeMiddle: null,
  rangeStart: null,
  rangeEnd: null,
  dayOutside: "data-outside-month:",
  cellSelected: "aria-selected:",
  cellSelectedAttribute: "[aria-selected=true]",
  navDisabled: "data-disabled:",
};
export const BITS_CALENDAR_STATES: { single: CalendarStates; range: CalendarStates; cell: CalendarCellStates } = {
  single: BITS_CALENDAR_DAY,
  range: {
    ...BITS_CALENDAR_DAY,
    selected: ["data-range-start:", "data-range-end:"],
    rangeMiddle: "data-range-middle:",
    rangeStart: "data-range-start:",
    rangeEnd: "data-range-end:",
  },
  cell: {
    today: "data-today:",
    outside: "data-outside-month:",
    disabled: "data-disabled:",
    rangeStart: "data-range-start:",
    rangeMiddle: "data-range-middle:",
    rangeEnd: "data-range-end:",
  },
};
