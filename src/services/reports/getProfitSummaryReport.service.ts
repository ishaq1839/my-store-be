import { getStoreSummaryRecord, listItemSummaryRecords } from "../../database/repos/reports.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import type { ReportPeriod } from "../bills/summaryDocIds";
import { resolveReportQuery } from "./resolveReportQuery";

export async function getProfitSummaryReportService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: ReportPeriod;
  date: string;
  scope: "overall" | "items";
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const query = resolveReportQuery({ period: input.period, date: input.date });
  const overall = await getStoreSummaryRecord(input.store_uuid, query.summary_doc_id);

  if (input.scope === "overall") {
    return {
      period: query.period,
      summary_doc_id: query.summary_doc_id,
      profit_after_discount: overall.profit_after_discount,
      revenue: overall.revenue,
      bill_count: overall.bill_count,
    };
  }

  const items = await listItemSummaryRecords(input.store_uuid, query.summary_doc_id);
  return {
    period: query.period,
    summary_doc_id: query.summary_doc_id,
    overall: {
      profit_after_discount: overall.profit_after_discount,
      revenue: overall.revenue,
      bill_count: overall.bill_count,
    },
    items: items.map((item) => ({
      item_id: item.item_id,
      item_name: item.item_name,
      profit_after_discount: item.profit_after_discount,
      revenue: item.revenue,
      quantity_sold: item.quantity_sold,
    })),
  };
}
