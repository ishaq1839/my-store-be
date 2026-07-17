import { listStaffSummaryRecords } from "../../database/repos/reports.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import type { ReportPeriod } from "../bills/summaryDocIds";
import { resolveReportQuery } from "./resolveReportQuery";
import { reportCacheKey, withReportCache } from "./reportsCache";

type StaffRankRow = {
  seller_id: string;
  seller_email: string;
  seller_name: string;
  bill_count: number;
  revenue: number;
  profit_after_discount: number;
  quantity_sold: number;
};

export async function getStaffPerformanceReportService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: ReportPeriod;
  date: string;
  rank_by: "bill_count" | "revenue" | "both";
  limit: number;
  refresh?: boolean;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const query = resolveReportQuery({ period: input.period, date: input.date });

  return withReportCache({
    key: reportCacheKey([
      "staff-performance",
      input.store_uuid,
      query.summary_doc_id,
      input.rank_by,
      input.limit,
    ]),
    forceRefresh: Boolean(input.refresh),
    loader: async () => {
      const rows: StaffRankRow[] = (await listStaffSummaryRecords(input.store_uuid, query.summary_doc_id)).map(
        (r) => ({
          seller_id: r.seller_id,
          seller_email: r.seller_email,
          seller_name: r.seller_name,
          bill_count: r.bill_count,
          revenue: r.revenue,
          profit_after_discount: r.profit_after_discount,
          quantity_sold: r.quantity_sold,
        }),
      );

      const byBillCount = [...rows]
        .sort((a, b) => b.bill_count - a.bill_count || b.revenue - a.revenue)
        .slice(0, input.limit);
      const byRevenue = [...rows]
        .sort((a, b) => b.revenue - a.revenue || b.bill_count - a.bill_count)
        .slice(0, input.limit);

      return {
        period: query.period,
        date: query.date,
        summary_doc_id: query.summary_doc_id,
        top_by_bill_count: input.rank_by === "revenue" ? undefined : byBillCount,
        top_by_revenue: input.rank_by === "bill_count" ? undefined : byRevenue,
        staff_of_period: byBillCount[0] || null,
      };
    },
  });
}
