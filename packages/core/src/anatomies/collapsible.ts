import { Anatomy } from "../components";

// Shows and hides one region. Unstyled apart from how its content opens.
export const collapsible = Anatomy.parse({
  name: "collapsible",
  parts: ["content"],
  states: [],
  axes: {},
  tokens: {},
  base: {
    content: { base: { duration: "{motion.duration.base}", easing: "{motion.easing.standard}" } },
  },
  sizes: {},
  variants: {},
});
