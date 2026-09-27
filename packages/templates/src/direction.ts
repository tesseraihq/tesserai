import type { Base } from "@tesserai/core";

// DirectionProvider and useDirection as in shadcn: Base UI's and Radix's providers, and on React
// Aria an I18nProvider whose locale's script sets the direction when only a direction is given.
export function directionTemplate(base: Base) {
  return (): string => {
    if (base === "base-ui") {
      return `export { DirectionProvider, useDirection } from "@base-ui/react/direction-provider";
`;
    }
    if (base === "radix") {
      return `import * as React from "react";
import { Direction } from "radix-ui";

function DirectionProvider({ dir, direction, children }: React.ComponentProps<typeof Direction.DirectionProvider> & { direction?: React.ComponentProps<typeof Direction.DirectionProvider>["dir"] }) {
  return <Direction.DirectionProvider dir={direction ?? dir}>{children}</Direction.DirectionProvider>;
}

const useDirection = Direction.useDirection;

export { DirectionProvider, useDirection };
`;
    }
    return `import * as React from "react";
import { I18nProvider, useLocale } from "react-aria-components";

// Given only a direction, a locale with a right-to-left (Arabic) or left-to-right (Latin) script sets it.
function DirectionProvider({ direction, ...props }: React.ComponentProps<typeof I18nProvider> & { direction?: "ltr" | "rtl" }) {
  const { locale: current } = useLocale();
  const locale = props.locale ?? (direction ? new Intl.Locale(current, { script: direction === "rtl" ? "Arab" : "Latn" }).toString() : undefined);
  return <I18nProvider {...props} {...(locale === undefined ? {} : { locale })} />;
}

function useDirection() {
  return useLocale().direction;
}

export { DirectionProvider, I18nProvider, useDirection, useLocale };
`;
  };
}
