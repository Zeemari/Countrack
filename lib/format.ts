const dateTime = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

export const formatTime = (iso: string) => dateTime.format(new Date(iso));

/** First 8 and last 4 hex chars: enough to compare by eye. */
export const shortHash = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-4)}`;

export const photoUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/result-photos/${path}`;

export const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
