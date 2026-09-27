import { Anatomy } from "../components";
import { rem } from "./shared";

export const table = Anatomy.parse({
  name: "table",
  parts: ["root", "header", "row", "head-cell", "cell", "footer", "caption"],
  states: ["hover", "selected"],
  axes: {},
  tokens: {
    cell: {
      "padding-x": { $type: "dimension", $value: "{space.4}" },
      "padding-y": { $type: "dimension", $value: "{space.3}" },
    },
    "header-height": { $type: "dimension", $value: rem(40) },
    "font-size": { $type: "dimension", $value: "{font.size.2}" },
  },
  base: {
    root: { base: { fontSize: "{table.font-size}", foreground: "{intent.neutral.text-strong}" } },
    row: {
      base: {
        border: "{intent.neutral.border}",
        borderWidth: "{border.width}",
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}",
      },
      states: {
        hover: { background: "{intent.neutral.subtle}" },
        selected: { background: "{intent.primary.subtle}" },
      },
    },
    "head-cell": {
      base: {
        foreground: "{intent.neutral.text}",
        fontWeight: "{font.weight.medium}",
        height: "{table.header-height}",
        paddingX: "{table.cell.padding-x}",
        paddingY: "{table.cell.padding-y}",
      },
    },
    cell: { base: { paddingX: "{table.cell.padding-x}", paddingY: "{table.cell.padding-y}" } },
    footer: { base: { background: "{intent.neutral.subtle}", fontWeight: "{font.weight.medium}", border: "{intent.neutral.border}", borderWidth: "{border.width}" } },
    caption: { base: { foreground: "{intent.neutral.text}", fontSize: "{font.size.1}", paddingY: "{space.3}" } },
  },
  sizes: {},
  variants: {},
});
