import clsx from "clsx";

type Status = "ready" | "stale" | "error";

const label: Record<Status, string> = { ready: "Ready", stale: "Untouched 30d", error: "Sync failed" };

export function DocCard({ title, words, status }: { title: string; words: number; status: Status }) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 font-mono text-xs text-ink-muted">{words.toLocaleString()} words</p>
      <span
        className={clsx(
          "mt-4 inline-block text-xs font-medium",
          status === "ready" && "text-success",
          status === "stale" && "text-warning",
          status === "error" && "text-danger",
        )}
      >
        {label[status]}
      </span>
    </article>
  );
}
