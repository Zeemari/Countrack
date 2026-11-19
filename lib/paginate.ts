/** Page links to show: always first and last, the current page with one neighbour each side, gaps as "gap". */
export function pageItems(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  // Near an edge, show a run of five so the bar does not jump in width.
  if (current <= 3) [2, 3, 4, 5].forEach((p) => keep.add(p));
  if (current >= total - 2) [total - 4, total - 3, total - 2, total - 1].forEach((p) => keep.add(p));
  const pages = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i && p - pages[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

/** Clamps a requested page into 1..pageCount and returns the slice bounds. */
export function pageWindow(page: number, size: number, count: number) {
  const pageCount = Math.max(1, Math.ceil(count / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (current - 1) * size;
  return { current, pageCount, start, end: Math.min(start + size, count) };
}
