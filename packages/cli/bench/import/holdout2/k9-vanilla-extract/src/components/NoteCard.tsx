import { Button } from "./Button";
import * as s from "./NoteCard.css";

type Props = { title: string; excerpt: string; edited: string; state: "synced" | "conflict" };

export function NoteCard({ title, excerpt, edited, state }: Props) {
  return (
    <article className={s.card}>
      <h2>{title}</h2>
      <p>{excerpt}</p>
      <p className={s.meta}>
        Edited {edited} · <span className={state === "synced" ? s.synced : s.conflict}>{state}</span>
      </p>
      <div>
        <Button tone="quiet">Share</Button> <Button>Open</Button>
      </div>
    </article>
  );
}
