// Page buttons for long lists: the first and last page, the current page with `siblings` pages on each side,
// and "gap" where pages are skipped. Pages are 0-based; the labels shown are page + 1.
export function pageList(current, total, siblings = 1) {
  if (total <= 0) return [];
  if (total <= 2 * siblings + 5) return Array.from({ length: total }, (_, i) => i);
  const cur = Math.min(Math.max(current, 0), total - 1);
  const start = Math.max(1, cur - siblings);
  const end = Math.min(total - 2, cur + siblings);
  const out = [0];
  if (start > 1) out.push("gap-start");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 2) out.push("gap-end");
  out.push(total - 1);
  return out;
}
