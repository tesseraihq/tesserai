type Props = {
  id: string;
  vessel: string;
  eta: string;
  status: "on-time" | "delayed" | "held";
};

const badge = {
  "on-time": "badge-success",
  delayed: "badge-warning",
  held: "badge-error",
};

export function ShipmentCard({ id, vessel, eta, status }: Props) {
  return (
    <article className="card border border-base-300 bg-base-200">
      <div className="card-body gap-2">
        <div className="flex items-center justify-between">
          <span className="shipment-id">{id}</span>
          <span className={`badge badge-soft ${badge[status]}`}>{status}</span>
        </div>
        <h2 className="card-title">{vessel}</h2>
        <p className="text-sm">ETA {eta}</p>
        <div className="card-actions justify-end">
          <button className="btn btn-ghost btn-sm">Details</button>
          <button className="btn btn-primary btn-sm">Track</button>
        </div>
      </div>
    </article>
  );
}
