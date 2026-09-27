import { Card } from "@/components/marketing/FeatureCard";
import { PrimaryAction } from "@/components/PrimaryAction";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { title: "Invoices", body: "Send and track invoices." },
  { title: "Seats", body: "Add people as you grow." },
  { title: "Exports", body: "CSV and PDF in one click." },
];

const embed = `<Button variant="ghost" className="rounded-none">Buy</Button>`;

export default function Landing() {
  return (
    <main>
      <section className="py-24 text-center">
        <Badge intent="info" className="mb-4 rounded-full px-3">New: exports</Badge>
        <h1 className="text-5xl font-semibold tracking-tight">Billing that stays out of the way</h1>
        <div className="mt-8 flex justify-center gap-3">
          <PrimaryAction>Start free trial</PrimaryAction>
          {/* <Button variant="link">Watch demo</Button> */}
          <Button variant="outline" size="lg" className="rounded-full">
            Talk to sales
          </Button>
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="rounded-3xl p-10">
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </Card>
        ))}
      </section>
      <pre>
        <code>{embed}</code>
      </pre>
      <p className="text-sm">
        Tip: wrap any <code>{"<Button>"}</code> in a form to submit it.
      </p>
    </main>
  );
}
