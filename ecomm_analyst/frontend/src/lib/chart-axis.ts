/** Full categorical tick label (no ellipsis). Pair with a wide `YAxis width` so text fits. */
export function fullYAxisLabel(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

/** Shorten categorical Y-axis labels; tooltips still receive full `name` from data. */
export function truncateYAxisLabel(v: unknown, maxLen = 32): string {
  if (v == null) return "";
  const s = String(v);
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(1, maxLen - 1))}…`;
}

/** Height for horizontal bars so each category band fits a tick label. */
export function verticalCategoryBarChartHeight(
  itemCount: number,
  options?: { min?: number; max?: number; band?: number; gutter?: number; empty?: number }
): number {
  const min = options?.min ?? 200;
  const max = options?.max ?? 520;
  const band = options?.band ?? 36;
  const gutter = options?.gutter ?? 52;
  const empty = options?.empty ?? min;
  if (itemCount <= 0) return empty;
  return Math.min(max, Math.max(min, itemCount * band + gutter));
}
