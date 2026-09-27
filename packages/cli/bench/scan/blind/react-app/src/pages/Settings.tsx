import * as React from "react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrimaryAction } from "@/components/PrimaryAction";
import { surface } from "@/lib/theme";

type Section = "profile" | "security" | "danger";
const brand = "#4f46e5";

export function Settings({ saved, error }: { saved: boolean; error?: string }) {
  const [tab, setTab] = React.useState<Section>("profile");
  const nameRef = React.useRef<HTMLInputElement>(null);
  const inputProps = { autoComplete: "off", spellCheck: false } as const;
  const tabs: Array<{ id: Section; label: string }> = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "danger", label: "Danger zone" },
  ];

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Section)} className="gap-8">
      <TabsList className="h-auto rounded-none border-b bg-transparent p-0">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="profile" className="mt-0">
        <Card>
          <CardContent className="grid gap-4 pt-6">
            {error ? (
              <Alert intent="danger" sx={{ py: 1, mt: 2 }}>
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            ) : saved ? (
              <Alert intent="success" style={{ marginBottom: 16 }}>
                <AlertTitle>Saved</AlertTitle>
              </Alert>
            ) : null}
            <Input ref={nameRef} {...inputProps} placeholder="Display name" size="lg" />
            <Input
              placeholder="Website"
              style={{ borderColor: brand, height: 44 }}
            />
          </CardContent>
          <CardFooter className="border-t py-4">
            <PrimaryAction type="submit">Save</PrimaryAction>
          </CardFooter>
        </Card>
      </TabsContent>
      <TabsContent value="security">
        <Card size="sm" style={{ boxShadow: "none" }}>
          <CardContent className="space-y-2">
            <p className="text-sm">Two-factor authentication is {saved ? "on" : "off"}.</p>
            <Button variant="outline" size="sm" className="md:w-auto w-full">
              Configure
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="danger">
        <Card className={surface("danger")}>
          <CardContent className="gap-3 pt-6">
            <p className="flex-1 text-sm">Deleting the workspace removes all data.</p>
            <Button
              intent="danger"
              variant={error ? "outline" : "solid"}
              className="shrink-0 self-end"
              onClick={() => confirm("Delete?") && console.log("bye")}
            >
              Delete workspace
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
