import type { LucideIcon } from "lucide-react";

type Props = { title: string; icon?: LucideIcon; action?: React.ReactNode; children: React.ReactNode };

/** Titled section card. */
export function Card({ title, icon: Icon, action, children }: Props) {
  return (
    <section className="card flex flex-col gap-4 p-5 animate-rise">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 font-semibold">
          {Icon && (
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon aria-hidden className="size-4.5" />
            </span>
          )}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
