import { useEffect, useState } from "react";
import { Button } from "./components/Button";
import { DocCard } from "./components/DocCard";

export default function App() {
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drafts</h1>
          <p className="text-ink-muted text-sm">Everything you haven’t published yet.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDark((d) => !d)}>
            {dark ? "Light" : "Dark"}
          </Button>
          <Button>New draft</Button>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <DocCard title="On margins" words={1840} status="ready" />
        <DocCard title="Letter to the co-op board" words={612} status="stale" />
        <DocCard title="Untitled" words={0} status="error" />
      </div>
    </div>
  );
}
