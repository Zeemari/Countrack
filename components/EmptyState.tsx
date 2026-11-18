import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; title: string; body?: string; children?: React.ReactNode };

/** Friendly "nothing here yet" panel that says what to do next. */
export function EmptyState({ icon: Icon, title, body, children }: Props) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center animate-rise">
      <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon aria-hidden className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {body && <p className="max-w-xs text-sm text-muted">{body}</p>}
      {children}
    </div>
  );
}

/** A terminal command shown as code. */
export function Command({ children }: { children: string }) {
  return (
    <code className="inline-flex items-center gap-2 rounded-xl bg-text px-4 py-2.5 font-mono text-sm text-bg select-all">
      <span aria-hidden className="opacity-50">$</span>
      {children}
    </code>
  );
}
