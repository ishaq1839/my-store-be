import { listBillsInRange } from "../../database/repos/bills.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import type { ReportPeriod } from "../bills/summaryDocIds";
import { periodRangeIso, summaryDocIdForPeriod, anchorIsoFromDate } from "../bills/summaryDocIds";
import { roundMoney } from "../bills/fifoBillAllocate";

export type SoldItemRow = {
  bill_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  /** Line display subtotal (sale amount before bill-level discount allocation). */
  sale_amount: number;
  /** Bill finalize timestamp (ISO) — this is the sale time. */
  sale_time: string;
};

function encodeCursor(c: { created_at: string; bill_id: string }): string {
  return Buffer.from(`${c.created_at}|${c.bill_id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { created_at: string; bill_id: string } | null {
  if (!cursor) return null;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const [created_at, bill_id] = raw.split("|");
    if (!created_at || !bill_id) return null;
    return { created_at, bill_id };
  } catch {
    return null;
  }
}

export async function getSalesItemsReportService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  period: ReportPeriod;
  date: string;
  limit: number;
  cursor?: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const range = periodRangeIso(input.period, input.date);
  const summary_doc_id = summaryDocIdForPeriod(input.period, anchorIsoFromDate(input.date));
  const cursor = decodeCursor(String(input.cursor || ""));

  const page = await listBillsInRange({
    store_uuid: input.store_uuid,
    from_iso: range.from_iso,
    to_iso: range.to_iso,
    limit: input.limit,
    cursor,
  });

  const items: SoldItemRow[] = [];
  for (const bill of page.bills) {
    const sale_time = String(bill.created_at);
    for (const line of bill.lines || []) {
      items.push({
        bill_id: String(bill.bill_id),
        item_id: String(line.item_id),
        item_name: String(line.item_name || ""),
        quantity: Number(line.quantity) || 0,
        sale_amount: roundMoney(Number(line.display_subtotal) || 0),
        sale_time,
      });
    }
  }

  return {
    period: input.period,
    date: input.date,
    summary_doc_id,
    from: range.from_iso,
    to: range.to_iso,
    total_quantity: items.reduce((s, r) => s + r.quantity, 0),
    total_sale_amount: roundMoney(items.reduce((s, r) => s + r.sale_amount, 0)),
    items,
    next_cursor: page.next_cursor ? encodeCursor(page.next_cursor) : null,
  };
}
