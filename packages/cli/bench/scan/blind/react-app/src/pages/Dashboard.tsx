import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrimaryAction } from "@/components/PrimaryAction";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

const MAX_SEATS = 25;

type Metric = { label: string; value: string; delta: number };

// TODO: bring back <Badge variant="solid" intent="info"> once the API reports trends.
export function Dashboard({ invoices, seats }: { invoices: Array<Invoice>; seats: number }) {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [pinned, setPinned] = useState<Metric[]>([]);
  const metrics = useMemo<Metric[]>(
    () => [
      { label: "MRR", value: "$12,480", delta: 4.2 },
      { label: "Active seats", value: String(seats), delta: seats < MAX_SEATS ? 1 : 0 },
      { label: "Churn", value: "1.8%", delta: -0.3 },
    ],
    [seats],
  );
  const open = invoices.filter((i) => i.status === "open").length;

  return (
    <div className="grid gap-6 p-6 md:grid-cols-3">
      {metrics.map((m) => (
        <Card
          key={m.label}
          size="sm"
          className={cn("gap-2", pinned.some((p) => p.label === m.label) && "ring-2")}
        >
          <CardHeader className="pb-0">
            <CardDescription>{m.label}</CardDescription>
            <CardTitle className="text-3xl">{m.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={m.delta >= 0 ? "soft" : "outline"} intent={m.delta >= 0 ? "success" : "danger"}>
              {m.delta > 0 ? "+" : ""}
              {m.delta}%
            </Badge>
            <Button variant="ghost" size="xs" className="rounded-full" onClick={() => setPinned((p) => [...p, m])} aria-label="Pin >">
              Pin
            </Button>
          </CardContent>
        </Card>
      ))}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={range} onValueChange={(v) => setRange(v as "7d" | "30d")} variant="segmented">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="7d">7 days</TabsTrigger>
              <TabsTrigger value="30d" className="data-[state=active]:bg-background data-[state=active]:shadow-none">
                30 days
              </TabsTrigger>
            </TabsList>
            <TabsContent value="7d">…</TabsContent>
            <TabsContent value="30d">…</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {open > 0 ? (
        <Card className="border-dashed md:col-span-2">
          <CardContent className="py-8 text-center">
            <p>{open} open invoices</p>
            <Button variant="outline" className="mt-4">Review</Button>
          </CardContent>
        </Card>
      ) : (
        <PrimaryAction className="self-start">Create invoice</PrimaryAction>
      )}
      {seats<MAX_SEATS && <Button intent="neutral" variant="soft" className={`h-8 px-3 ${seats > 20 ? "bg-amber-100 text-amber-900" : ""}`}>Add seats</Button>}
    </div>
  );
}
