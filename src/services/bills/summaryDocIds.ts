/** UTC date keys for sales_summary document ids. */

export function dailySummaryDocId(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `daily_${y}-${m}-${day}`;
}

export function monthlySummaryDocId(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `monthly_${y}-${m}`;
}

/**
 * ISO week-year and week number (UTC). Doc id: weekly_2025-W11
 */
export function weeklySummaryDocId(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  const x = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const isoYear = x.getUTCFullYear();
  const w0 = new Date(Date.UTC(isoYear, 0, 1));
  const w0d = w0.getUTCDay() || 7;
  const week1Mon = new Date(w0);
  week1Mon.setUTCDate(w0.getUTCDate() - (w0d - 1) + (w0d <= 4 ? 0 : 7));
  const mon = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const monD = mon.getUTCDay() || 7;
  mon.setUTCDate(mon.getUTCDate() - (monD - 1));
  const w = Math.floor((mon.getTime() - week1Mon.getTime()) / 604800000) + 1;
  const ww = Math.min(53, Math.max(1, w));
  return `weekly_${isoYear}-W${String(ww).padStart(2, "0")}`;
}
