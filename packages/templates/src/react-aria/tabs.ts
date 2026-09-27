import type { Anatomy } from "@tesserai/core";
import { tabsSource } from "../tabs-shared";
import { RAC_STATES } from "./states";

export function renderTabs(anatomy: Anatomy): string {
  return tabsSource(anatomy, {
    states: RAC_STATES,
    selected: "data-selected:",
    imports: `import { Tab as TabPrimitive, TabList as TabListPrimitive, TabPanel as TabPanelPrimitive, Tabs as TabsPrimitive, composeRenderProps, type TabListProps, type TabPanelProps, type TabProps, type TabsProps } from "react-aria-components";`,
    components: (c) => `// defaultSelectedKey / selectedKey pick a tab by its id.
function Tabs({ className, ...props }: TabsProps) {
  return <TabsPrimitive data-slot="tabs" className={composeRenderProps(className, (className) => cn(${c.root}, className))} {...props} />;
}

function TabsList<T extends object>({ className, variant, ...props }: TabListProps<T> & { variant?: Variant | Alias }) {
  const resolved = resolveVariant(variant);
  return <TabListPrimitive data-slot="tabs-list" data-variant={resolved} className={composeRenderProps(className, (className) => cn(tabsListVariants({ variant: resolved }), className))} {...props} />;
}

function TabsTrigger({ className, children, ...props }: TabProps) {
  return (
    <TabPrimitive data-slot="tabs-trigger" className={composeRenderProps(className, (className) => cn(${c.trigger}, className))} {...props}>
      {label(children)}
    </TabPrimitive>
  );
}

function TabsContent({ className, ...props }: TabPanelProps) {
  return <TabPanelPrimitive data-slot="tabs-content" className={composeRenderProps(className, (className) => cn(${c.content}, className))} {...props} />;
}`,
  });
}
