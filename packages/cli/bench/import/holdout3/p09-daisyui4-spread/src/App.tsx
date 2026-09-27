import { NoteCard } from "./components/NoteCard";

const notes = [
  { id: 1, title: "Wetland transect 4", body: "Heron count down from last month; water level +12cm.", tag: "survey" },
  { id: 2, title: "Trail camera B", body: "Battery swapped. Two fox sightings overnight.", tag: "camera" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="navbar border-b border-base-300">
        <div className="flex-1 px-2 text-xl font-bold font-display">Fieldnote</div>
        <select data-choose-theme className="select select-bordered select-sm">
          <option value="fieldnote">Light</option>
          <option value="fieldnote-dark">Dark</option>
        </select>
      </div>
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notes</h1>
          <button className="btn btn-primary">New note</button>
        </div>
        {notes.map((n) => (
          <NoteCard key={n.id} {...n} />
        ))}
      </main>
    </div>
  );
}
