import { getStoreSummaryRecord, listItemSummaryRecords } from "../../database/repos/reports.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import type { ReportPeriod } from "../bills/summaryDocIds";
import { resolveReportQuery } from "./resolveReportQuery";
import { reportCacheKey, withReportCache } from "./reportsCache";

export async function getSalesSummaryReportService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: ReportPeriod;
  date: string;
  scope: "overall" | "items";
  refresh?: boolean;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const query = resolveReportQuery({ period: input.period, date: input.date });

  return withReportCache({
    key: reportCacheKey(["sales-summary", input.store_uuid, query.summary_doc_id, input.scope]),
    forceRefresh: Boolean(input.refresh),
    loader: async () => {
      const overall = await getStoreSummaryRecord(input.store_uuid, query.summary_doc_id);

      if (input.scope === "overall") {
        return {
          period: query.period,
          summary_doc_id: query.summary_doc_id,
          revenue: overall.revenue,
          bill_count: overall.bill_count,
          quantity_sold: overall.quantity_sold,
          profit_after_discount: overall.profit_after_discount,
        };
      }

      const items = await listItemSummaryRecords(input.store_uuid, query.summary_doc_id);
      return {
        period: query.period,
        summary_doc_id: query.summary_doc_id,
        overall: {
          revenue: overall.revenue,
          bill_count: overall.bill_count,
          quantity_sold: overall.quantity_sold,
          profit_after_discount: overall.profit_after_discount,
        },
        items: items.map((item) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity_sold: item.quantity_sold,
          revenue: item.revenue,
        })),
      };
    },
  });
}
