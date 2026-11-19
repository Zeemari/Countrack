import { ChevronDown, Loader2 } from "lucide-react";

type Option = { value: string; label: string };
type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  /** Step number shown before the label. */
  step?: number;
  /** Classes for the step dot once a value is chosen. */
  doneClass?: string;
};

/** Labelled native select (keeps the phone's own picker) styled like .field. */
export function Select({ label, value, options, onChange, placeholder, disabled, loading, step, doneClass = "bg-brand text-brand-ink" }: Props) {
  return (
    <label className={`flex flex-col gap-1.5 ${disabled ? "opacity-55" : ""}`}>
      <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        {step !== undefined && (
          <span className={`grid size-5 place-items-center rounded-full text-[10px] ${value ? doneClass : "bg-surface-2 text-muted"}`}>{step}</span>
        )}
        {label}
      </span>
      <span className="relative">
        <select
          value={value}
          disabled={disabled || loading}
          onChange={(e) => onChange(e.target.value)}
          className="field min-h-12 cursor-pointer appearance-none truncate pr-10 disabled:cursor-not-allowed"
        >
          <option value="">{loading ? "Loading…" : placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {loading ? (
          <Loader2 aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted" />
        ) : (
          <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted" />
        )}
      </span>
    </label>
  );
}
