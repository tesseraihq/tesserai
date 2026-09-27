import { FluentProvider, makeStyles, tokens } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { kilnDarkTheme, kilnLightTheme } from "./theme/theme";
import { FiringQueue } from "./components/FiringQueue";

const useStyles = makeStyles({
  shell: {
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
  },
});

function usePrefersDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export function Root() {
  const styles = useStyles();
  const dark = usePrefersDark();
  return (
    <FluentProvider theme={dark ? kilnDarkTheme : kilnLightTheme}>
      <div className={styles.shell}>
        <FiringQueue />
      </div>
    </FluentProvider>
  );
}
