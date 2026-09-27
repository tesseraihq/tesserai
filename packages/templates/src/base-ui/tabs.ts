import type { Anatomy } from "@tesserai/core";
import { BASE_UI_STATES } from "../classes";
import { tabsSource } from "../tabs-shared";

export function renderTabs(anatomy: Anatomy): string {
  return tabsSource(anatomy, {
    // Base UI marks the selected tab with data-active.
    states: { ...BASE_UI_STATES, selected: ["data-active:"] },
    selected: "data-active:",
    imports: `import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";`,
    components: (c) => `type ClassName = { className?: string };

function Tabs({ className, orientation = "horizontal", ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.Root>, "className"> & ClassName) {
  return <TabsPrimitive.Root data-slot="tabs" data-orientation={orientation} orientation={orientation} className={cn(${c.root}, className)} {...props} />;
}

function TabsList({ className, variant, ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.List>, "className"> & ClassName & { variant?: Variant | Alias }) {
  const resolved = resolveVariant(variant);
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={resolved} className={cn(tabsListVariants({ variant: resolved }), className)} {...props} />;
}

function TabsTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.Tab>, "className"> & ClassName) {
  return (
    <TabsPrimitive.Tab data-slot="tabs-trigger" className={cn(${c.trigger}, className)} {...props}>
      {label(children)}
    </TabsPrimitive.Tab>
  );
}

function TabsContent({ className, ...props }: Omit<React.ComponentProps<typeof TabsPrimitive.Panel>, "className"> & ClassName) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn(${c.content}, className)} {...props} />;
}`,
  });
}
