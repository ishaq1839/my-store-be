/** UTC date keys for sales_summary document ids. */

export type ReportPeriod = "day" | "week" | "month" | "year";

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

export function yearlySummaryDocId(isoTimestamp: string): string {
  const d = new Date(isoTimestamp);
  return `yearly_${d.getUTCFullYear()}`;
}

export function summaryDocIdForPeriod(period: ReportPeriod, isoTimestamp: string): string {
  if (period === "day") return dailySummaryDocId(isoTimestamp);
  if (period === "week") return weeklySummaryDocId(isoTimestamp);
  if (period === "month") return monthlySummaryDocId(isoTimestamp);
  return yearlySummaryDocId(isoTimestamp);
}

export function anchorIsoFromDate(date: string): string {
  return date.includes("T") ? date : `${date}T12:00:00.000Z`;
}

/** UTC inclusive range for a report period anchored on `date` (YYYY-MM-DD or ISO). */
export function periodRangeIso(period: ReportPeriod, date: string): { from_iso: string; to_iso: string } {
  const anchor = new Date(anchorIsoFromDate(date));
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const d = anchor.getUTCDate();

  if (period === "day") {
    return {
      from_iso: new Date(Date.UTC(y, m, d, 0, 0, 0, 0)).toISOString(),
      to_iso: new Date(Date.UTC(y, m, d, 23, 59, 59, 999)).toISOString(),
    };
  }

  if (period === "month") {
    return {
      from_iso: new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)).toISOString(),
      to_iso: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)).toISOString(),
    };
  }

  if (period === "year") {
    return {
      from_iso: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString(),
      to_iso: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)).toISOString(),
    };
  }

  // week: Monday 00:00 UTC → Sunday 23:59:59.999 UTC (ISO week)
  const day = anchor.getUTCDay() || 7;
  const monday = new Date(Date.UTC(y, m, d));
  monday.setUTCDate(monday.getUTCDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from_iso: new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0)).toISOString(),
    to_iso: new Date(Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 23, 59, 59, 999)).toISOString(),
  };
}
