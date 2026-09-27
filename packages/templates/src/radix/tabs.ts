import type { Anatomy } from "@tesserai/core";
import { RADIX_TABS, tabsSource } from "../tabs-shared";

export function renderTabs(anatomy: Anatomy): string {
  return tabsSource(anatomy, {
    ...RADIX_TABS,
    imports: `import { Tabs as TabsPrimitive } from "radix-ui";`,
    components: (c) => `function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" orientation={orientation} className={cn(${c.root}, className)} {...props} />;
}

function TabsList({ className, variant, ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: Variant | Alias }) {
  const resolved = resolveVariant(variant);
  return <TabsPrimitive.List data-slot="tabs-list" data-variant={resolved} className={cn(tabsListVariants({ variant: resolved }), className)} {...props} />;
}

function TabsTrigger({ className, children, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(${c.trigger}, className)} {...props}>
      {label(children)}
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn(${c.content}, className)} {...props} />;
}`,
  });
}
