import { ShipmentCard } from "./components/ShipmentCard";
import { ThemeToggle } from "./components/ThemeToggle";

const shipments = [
  { id: "HB-20931", vessel: "MV Aurora Bay", eta: "Today 14:20", status: "on-time" as const },
  { id: "HB-20944", vessel: "Coral Runner", eta: "Today 17:05", status: "delayed" as const },
  { id: "HB-20950", vessel: "North Quay 3", eta: "Tomorrow 06:40", status: "held" as const },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="navbar border-b border-base-300 px-6">
        <div className="flex-1 text-lg font-semibold">Harbor Dispatch</div>
        <ThemeToggle />
        <button className="btn btn-primary btn-sm ml-3">New booking</button>
      </header>
      <main className="mx-auto grid max-w-5xl gap-4 p-6 md:grid-cols-3">
        {shipments.map((s) => (
          <ShipmentCard key={s.id} {...s} />
        ))}
      </main>
    </div>
  );
}
