import { Button } from "@/components/ui/button";
import { Badge as Pill } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// <Button variant="link"> in a comment isn't a use.
export function App({ busy, tone }: { busy: boolean; tone: "danger" | "neutral" }) {
  return (
    <main className="mx-auto max-w-5xl p-8">
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => console.log("save")} variant="outline" size="sm">
            Save
          </Button>
          <Button
            variant="ghost"
            intent="danger"
            onClick={() => {
              if (busy) return;
            }}
          >
            Delete
          </Button>
          <Button className="rounded-none" intent={tone}>Tone</Button>
          <Button className={cn("w-full", busy && "opacity-50")}>Wide</Button>
          <Pill>New</Pill>
          <Pill variant="solid" intent="success" className="rounded-none uppercase">Live</Pill>
        </CardContent>
      </Card>
    </main>
  );
}
