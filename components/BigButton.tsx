import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  primary?: boolean;
  badge?: string; // e.g. "Coming soon"; also disables the button
};

/** Large icon-led tap target (min 80px tall) for the home screen. */
export function BigButton({ href, icon: Icon, label, hint, primary, badge }: Props) {
  const tone = primary
    ? "bg-brand text-brand-ink border-transparent"
    : "bg-surface text-text border-border";
  const body = (
    <>
      <span
        className={`grid size-14 shrink-0 place-items-center rounded-xl ${primary ? "bg-white/15" : "bg-ok-bg text-ok-text"}`}
      >
        <Icon aria-hidden className="size-8" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-lg font-semibold leading-tight">{label}</span>
        <span className={`text-sm ${primary ? "opacity-85" : "text-muted"}`}>{hint}</span>
      </span>
      {badge && (
        <span className="ml-auto shrink-0 rounded-full bg-pending-bg px-2.5 py-1 text-xs font-medium text-pending-text">
          {badge}
        </span>
      )}
    </>
  );
  const cls = `flex min-h-20 w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-sm ${tone}`;

  if (badge) return <div aria-disabled className={`${cls} opacity-60`}>{body}</div>;
  return (
    <Link href={href} className={`${cls} transition active:scale-[0.98]`}>
      {body}
    </Link>
  );
}
