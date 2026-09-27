import { Anatomy } from "../components";

// Items are Toggles (the generated code imports Toggle's variants), so they are styled in Toggle;
// the group styles the spacing between them. spacing={0} joins them into one segmented bar.
export const toggleGroup = Anatomy.parse({
  name: "toggle-group",
  parts: ["group"],
  states: ["horizontal", "vertical"],
  axes: {},
  tokens: {
    gap: { $type: "dimension", $value: "{space.2}" },
  },
  base: {
    group: { base: { gap: "{toggle-group.gap}" } },
  },
  sizes: {},
  variants: {},
});
