type Props = { title: string; body: string; tag: string };

export function NoteCard({ title, body, tag }: Props) {
  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">
          {title}
          <div className="badge badge-outline">{tag}</div>
        </h2>
        <p>{body}</p>
        <div className="card-actions justify-end">
          <button className="btn btn-ghost btn-sm text-error">Delete</button>
          <button className="btn btn-primary btn-sm">Open</button>
        </div>
      </div>
    </div>
  );
}
