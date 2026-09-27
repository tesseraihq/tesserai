import { NoteCard } from "./components/NoteCard";

export default function App() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Notebook</h1>
      <NoteCard title="Reading list" excerpt="The Dispossessed, Piranesi, A Psalm for the Wild-Built…" edited="2h ago" state="synced" />
      <NoteCard title="Trip — Lisbon" excerpt="Tram 28 early, Time Out Market for lunch, LX Factory…" edited="yesterday" state="conflict" />
    </main>
  );
}
