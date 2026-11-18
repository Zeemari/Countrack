/** Titled section card. */
export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
