import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

// Tests render against Fluent's stock theme so snapshots don't churn with brand tweaks.
export function renderWithTheme(ui: ReactElement) {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
}
