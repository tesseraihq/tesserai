import type { CalendarCellStates, CalendarStates } from "../calendar";
import type { StatePrefixes } from "../classes";
import { renameRadixVars } from "../css-vars";
import { RADIX_STATES } from "../radix/states";

// Reka UI marks state as Radix does (data-state="open|checked|on|active", data-disabled,
// data-highlighted, data-orientation), so its parts take Radix's state prefixes. Its calendar
// (below) and splitter differ.
export const REKA_STATES: StatePrefixes = RADIX_STATES;

// Radix's CSS variables under Reka's name (--radix-select-trigger-width -> --reka-select-trigger-width).
export const rekaVars = (classes: string): string => renameRadixVars(classes, "reka");

// Reka's calendar marks a day's state on the day (CalendarCellTrigger): data-selected,
// data-today, data-outside-view, data-disabled, and on a range calendar's days data-selection-start
// and data-selection-end, with data-selected on every day of the range. Its cell (a td) says only
// aria-selected and data-disabled, so the cell reads the rest from its day (has-data-today:).
// Focus is the day button's own. See calendar.ts's CalendarStates for what each prefix does.
const REKA_CALENDAR_DAY: CalendarStates = {
  dayFocus: "focus-visible:",
  selected: ["data-selected:"],
  rangeMiddle: null,
  rangeStart: null,
  rangeEnd: null,
  dayOutside: "data-outside-view:",
  cellSelected: "aria-selected:",
  cellSelectedAttribute: "[aria-selected=true]",
  navDisabled: "data-disabled:",
};
export const REKA_CALENDAR_STATES: { single: CalendarStates; range: CalendarStates; cell: CalendarCellStates } = {
  single: REKA_CALENDAR_DAY,
  range: {
    ...REKA_CALENDAR_DAY,
    selected: ["data-selection-start:", "data-selection-end:"],
    rangeMiddle: "data-selected:not-data-selection-start:not-data-selection-end:",
    rangeStart: "data-selection-start:",
    rangeEnd: "data-selection-end:",
  },
  cell: {
    today: "has-data-today:",
    outside: "has-data-outside-view:",
    disabled: "data-disabled:",
    rangeStart: "has-data-selection-start:",
    rangeMiddle: "aria-selected:not-has-data-selection-start:not-has-data-selection-end:",
    rangeEnd: "has-data-selection-end:",
  },
};
