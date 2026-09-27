type Props = {
  id: string;
  customer: string;
  amount: number;
  status: "paid" | "due" | "overdue";
};

const badge: Record<Props["status"], string> = {
  paid: "badge-success",
  due: "badge-warning",
  overdue: "badge-error",
};

export function InvoiceCard({ id, customer, amount, status }: Props) {
  return (
    <article className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-base-content/60">{id}</span>
          <span className={`badge badge-soft ${badge[status]}`}>{status}</span>
        </div>
        <h2 className="card-title">{customer}</h2>
        <p className="text-3xl font-semibold tabular-nums">
          {amount.toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </p>
        {status === "overdue" && (
          <div role="alert" className="alert alert-error alert-soft text-sm">
            Payment is 14 days late.
          </div>
        )}
        <div className="card-actions justify-end">
          <button className="btn btn-ghost btn-sm">View</button>
          <button className="btn btn-primary btn-sm">Send reminder</button>
        </div>
      </div>
    </article>
  );
}
