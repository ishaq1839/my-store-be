import type { ReportPeriod } from "../bills/summaryDocIds";
import { anchorIsoFromDate, summaryDocIdForPeriod } from "../bills/summaryDocIds";

export function resolveReportQuery(input: { period: ReportPeriod; date: string }) {
  const anchor_iso = anchorIsoFromDate(input.date);
  const summary_doc_id = summaryDocIdForPeriod(input.period, anchor_iso);
  return { period: input.period, date: input.date, summary_doc_id, anchor_iso };
}
