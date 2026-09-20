export function PlaceholderPage({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">{title}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          Coming in a later phase
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{description}</p>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-800">Planned for this screen</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
