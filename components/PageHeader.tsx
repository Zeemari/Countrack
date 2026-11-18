import { BackLink } from "@/components/BackLink";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: React.ReactNode;
  back?: { href: string; label?: string };
  /** Right-aligned on wide screens (e.g. a primary action). */
  action?: React.ReactNode;
};

/** Consistent page top: optional back link, eyebrow, title and one-line explanation. */
export function PageHeader({ title, subtitle, eyebrow, back, action }: Props) {
  return (
    <header className="flex flex-col gap-4 animate-rise md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1.5">
        {back && <BackLink href={back.href} label={back.label} />}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="display text-4xl text-balance md:text-6xl">{title}</h1>
        {subtitle && <p className="max-w-2xl text-muted md:text-lg">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
