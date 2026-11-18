/** CounTrack mark: a sealed result sheet. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden className={className}>
      <rect width="512" height="512" rx="128" fill="var(--brand)" />
      <rect x="136" y="96" width="240" height="300" rx="28" fill="#fff" />
      <rect x="172" y="146" width="168" height="20" rx="10" fill="#cfe5d8" />
      <rect x="172" y="188" width="120" height="20" rx="10" fill="#cfe5d8" />
      <path d="M184 288l48 48 96-104" fill="none" stroke="var(--brand)" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="96" y="372" width="320" height="48" rx="24" fill="var(--accent)" />
    </svg>
  );
}
