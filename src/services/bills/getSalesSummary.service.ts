import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { getSalesSummaryDoc } from "../../database/repos/bills.repo";
import { dailySummaryDocId, monthlySummaryDocId, weeklySummaryDocId } from "./summaryDocIds";
import { reportCacheKey, withReportCache } from "../reports/reportsCache";

export async function getSalesSummaryService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: "day" | "week" | "month";
  date: string;
  refresh?: boolean;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const anchor = input.date.includes("T") ? input.date : `${input.date}T12:00:00.000Z`;

  let doc_id: string;
  if (input.period === "day") doc_id = dailySummaryDocId(anchor);
  else if (input.period === "week") doc_id = weeklySummaryDocId(anchor);
  else doc_id = monthlySummaryDocId(anchor);

  return withReportCache({
    key: reportCacheKey(["bills-summary", input.store_uuid, doc_id]),
    forceRefresh: Boolean(input.refresh),
    loader: async () => {
      const data = await getSalesSummaryDoc(input.store_uuid, doc_id);
      return {
        period: input.period,
        summary_doc_id: doc_id,
        revenue: data?.revenue ?? 0,
        bill_count: data?.bill_count ?? 0,
      };
    },
  });
}
