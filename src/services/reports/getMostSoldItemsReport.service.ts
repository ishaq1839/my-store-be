import { listItemSummaryRecords } from "../../database/repos/reports.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import type { ReportPeriod } from "../bills/summaryDocIds";
import { resolveReportQuery } from "./resolveReportQuery";
import { reportCacheKey, withReportCache } from "./reportsCache";

type RankedItem = {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  revenue: number;
};

function topByQuantity(items: RankedItem[], limit: number): RankedItem[] {
  return [...items]
    .sort((a, b) => b.quantity_sold - a.quantity_sold || b.revenue - a.revenue)
    .slice(0, limit);
}

function topByRevenue(items: RankedItem[], limit: number): RankedItem[] {
  return [...items]
    .sort((a, b) => b.revenue - a.revenue || b.quantity_sold - a.quantity_sold)
    .slice(0, limit);
}

export async function getMostSoldItemsReportService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: ReportPeriod;
  date: string;
  rank_by: "quantity" | "revenue" | "both";
  limit: number;
  refresh?: boolean;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const query = resolveReportQuery({ period: input.period, date: input.date });

  return withReportCache({
    key: reportCacheKey([
      "most-sold-items",
      input.store_uuid,
      query.summary_doc_id,
      input.rank_by,
      input.limit,
    ]),
    forceRefresh: Boolean(input.refresh),
    loader: async () => {
      const rawItems = await listItemSummaryRecords(input.store_uuid, query.summary_doc_id);
      const items: RankedItem[] = rawItems.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity_sold: item.quantity_sold,
        revenue: item.revenue,
      }));

      const base = {
        period: query.period,
        summary_doc_id: query.summary_doc_id,
      };

      if (input.rank_by === "quantity") {
        return { ...base, top_by_quantity: topByQuantity(items, input.limit) };
      }
      if (input.rank_by === "revenue") {
        return { ...base, top_by_revenue: topByRevenue(items, input.limit) };
      }

      return {
        ...base,
        top_by_quantity: topByQuantity(items, input.limit),
        top_by_revenue: topByRevenue(items, input.limit),
      };
    },
  });
}
