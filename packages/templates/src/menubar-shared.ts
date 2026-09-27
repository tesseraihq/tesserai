import { type Anatomy } from "@tesserai/core";
import { mapStates, type StatePrefixes } from "./classes";
import { classString } from "./codegen";
import { flatClasses } from "./factor";

// The bar and a menu's trigger, as class lists (for pieces).
export function menubarBarAndTriggerLists(anatomy: Anatomy, open: string[], extra: Partial<StatePrefixes> = {}) {
  const none = mapStates(() => []);
  return {
    bar: flatClasses(anatomy, "bar", { states: none }, ["flex", "items-center"]),
    trigger: flatClasses(anatomy, "trigger", { states: { ...none, hover: ["hover:"], "focus-visible": ["focus-visible:"], open, ...extra } }, ["flex", "items-center", "outline-none", "select-none", "cursor-default"]),
  };
}

export function menubarBarAndTrigger(anatomy: Anatomy, open: string[], extra: Partial<StatePrefixes> = {}) {
  const { bar, trigger } = menubarBarAndTriggerLists(anatomy, open, extra);
  return { bar: classString(bar), trigger: classString(trigger) };
}
