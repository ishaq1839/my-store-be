import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { getInventoryItem } from "../../database/repos/inventoryItems.repo";
import { listBatchesAsc } from "../../database/repos/inventoryBatches.repo";
import { fifoAllocateForBill, mergeBillLines, roundMoney } from "./fifoBillAllocate";

export async function previewBillService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  lines: { item_id: string; quantity: number }[];
  final_total?: number;
  discount_percent?: number;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const merged = mergeBillLines(input.lines);
  if (!merged.length) throw new AppError("No valid line items", { statusCode: 400 });

  let retail_floor_total = 0;
  let display_subtotal_total = 0;
  const lineDetails: {
    item_id: string;
    item_name: string;
    quantity: number;
    sufficient_stock: boolean;
    retail_subtotal: number;
    display_subtotal: number;
    fifo_chunks: ReturnType<typeof fifoAllocateForBill>["chunks"];
  }[] = [];

  for (const line of merged) {
    const item = await getInventoryItem(input.store_uuid, line.item_id);
    if (!item) throw new AppError(`Item not found: ${line.item_id}`, { statusCode: 404 });
    const batches = await listBatchesAsc(input.store_uuid, line.item_id);
    const alloc = fifoAllocateForBill(batches, line.quantity);
    retail_floor_total += alloc.retail_subtotal;
    display_subtotal_total += alloc.display_subtotal;
    lineDetails.push({
      item_id: line.item_id,
      item_name: item.name,
      quantity: line.quantity,
      sufficient_stock: alloc.ok,
      retail_subtotal: roundMoney(alloc.retail_subtotal),
      display_subtotal: roundMoney(alloc.display_subtotal),
      fifo_chunks: alloc.chunks,
    });
  }

  retail_floor_total = roundMoney(retail_floor_total);
  display_subtotal_total = roundMoney(display_subtotal_total);

  const profit_total = roundMoney(Math.max(0, display_subtotal_total - retail_floor_total));
  const max_discount_percent = profit_total > 0 ? 100 : 0;

  let final_total_whatif: number | undefined;
  let implied_discount_percent: number | undefined;
  let discount_amount_whatif: number | undefined;
  if (input.discount_percent != null && Number.isFinite(input.discount_percent)) {
    const dp = Math.max(0, Math.min(100, Number(input.discount_percent)));
    implied_discount_percent = roundMoney(dp);
    const raw = roundMoney(retail_floor_total + profit_total * (1 - dp / 100));
    final_total_whatif = raw;
    discount_amount_whatif = roundMoney(display_subtotal_total - raw);
  } else if (input.final_total != null && Number.isFinite(input.final_total)) {
    const ft = roundMoney(input.final_total);
    final_total_whatif = ft;
    if (ft < retail_floor_total - 1e-6) {
      implied_discount_percent = undefined;
    } else if (profit_total > 0) {
      const clamped = Math.min(display_subtotal_total, Math.max(ft, retail_floor_total));
      implied_discount_percent = roundMoney(((display_subtotal_total - clamped) / profit_total) * 100);
    } else {
      implied_discount_percent = 0;
    }
    discount_amount_whatif = roundMoney(display_subtotal_total - Math.min(display_subtotal_total, Math.max(ft, retail_floor_total)));
  }

  return {
    lines: lineDetails,
    retail_floor_total,
    display_subtotal_total,
    profit_total,
    max_discount_percent,
    all_in_stock: lineDetails.every((l) => l.sufficient_stock),
    final_total_whatif,
    implied_discount_percent,
    discount_amount_whatif,
  };
}
