// How composition differs between the libraries, shared by the builder's preview (which adapts
// hand-written example code at runtime) and the page printer (which writes each library's own code).

// React Aria names behaviour props differently (isDisabled, onPress, isSelected, and items and tabs
// selected by id). Pages are written with the Base UI / Radix names; this maps them per export.
export const REACT_ARIA_PROPS: Record<string, Record<string, string>> = {
  Button: { disabled: "isDisabled", onClick: "onPress" },
  Checkbox: { checked: "isSelected", defaultChecked: "defaultSelected", onCheckedChange: "onChange", disabled: "isDisabled" },
  Switch: { checked: "isSelected", defaultChecked: "defaultSelected", onCheckedChange: "onChange", disabled: "isDisabled" },
  RadioGroup: { disabled: "isDisabled", onValueChange: "onChange" },
  RadioGroupItem: { disabled: "isDisabled" },
  Slider: { disabled: "isDisabled", onValueChange: "onChange", min: "minValue", max: "maxValue" },
  Toggle: { pressed: "isSelected", defaultPressed: "defaultSelected", onPressedChange: "onChange", disabled: "isDisabled" },
  ToggleGroupItem: { value: "id", disabled: "isDisabled" },
  Select: { disabled: "isDisabled" },
  AccordionItem: { value: "id", disabled: "isDisabled" },
  Collapsible: { open: "isExpanded", defaultOpen: "defaultExpanded", onOpenChange: "onExpandedChange" },
  TooltipContent: { side: "placement", sideOffset: "offset" },
  SelectItem: { value: "id", disabled: "isDisabled" },
  Tabs: { defaultValue: "defaultSelectedKey", value: "selectedKey", onValueChange: "onSelectionChange" },
  TabsTrigger: { value: "id", disabled: "isDisabled" },
  TabsContent: { value: "id" },
  DropdownMenuItem: { disabled: "isDisabled", onClick: "onAction" },
  ContextMenuItem: { disabled: "isDisabled", onClick: "onAction" },
  CommandItem: { disabled: "isDisabled", onSelect: "onAction" },
  MenubarItem: { disabled: "isDisabled", onClick: "onAction" },
};

// shadcn's React Aria versions name the content after the component (Popover is the panel) and
// put the open state in XTrigger, where Base UI and Radix have X as the root, XTrigger as the
// button and XContent as the panel.
export const RAC_SHAPES = ["Dialog", "AlertDialog", "Sheet", "Popover", "HoverCard", "DropdownMenu", "ContextMenu", "Tooltip"] as const;
