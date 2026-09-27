import { InvoiceCard } from "./components/InvoiceCard";

const invoices = [
  { id: "INV-1042", customer: "Northwind Traders", amount: 1840.5, status: "paid" as const },
  { id: "INV-1043", customer: "Blue Heron Cafe", amount: 312.0, status: "due" as const },
  { id: "INV-1044", customer: "Kettle & Co.", amount: 96.25, status: "overdue" as const },
];

export default function App() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-base-content/60">Last synced 4 minutes ago</p>
        </div>
        <button className="btn btn-primary">New invoice</button>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {invoices.map((inv) => (
          <InvoiceCard key={inv.id} {...inv} />
        ))}
      </div>
    </main>
  );
}
