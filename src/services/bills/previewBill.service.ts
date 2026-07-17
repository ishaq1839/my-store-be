import { AppError } from "../../errors/AppError";
import {
  assertCanSellAtStore,
  assertStaffCannotApplyDiscounts,
} from "../inventory/assertStoreInventoryAccess.service";
import {
  getPreviewActiveBatchesForItems,
  getPreviewItemsByIds,
} from "./previewDataCache";
import { isServiceItem } from "../inventory/inventoryItemTypes";
import {
  allocateCustomLine,
  allocateServiceLine,
  applyUnitDiscountToAllocation,
  computeBillTotals,
  fifoAllocateForBill,
  hasAnyUnitDiscount,
  normalizeBillLines,
  roundMoney,
  type BillLineInput,
} from "./fifoBillAllocate";

export async function previewBillService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  lines: BillLineInput[];
  final_total?: number;
  discount_percent?: number;
}) {
  let normalized;
  try {
    normalized = normalizeBillLines(input.lines);
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "UNIT_DISCOUNT_CONFLICT") {
      throw new AppError(err.message || "Conflicting unit_discount", { statusCode: 400 });
    }
    throw e;
  }

  if (!normalized.items.length && !normalized.customs.length) {
    throw new AppError("No valid line items", { statusCode: 400 });
  }

  const itemIds = normalized.items.map((line) => line.item_id);

  const [accessCtx, itemsById, batchesByItemId] = await Promise.all([
    assertCanSellAtStore(input.actor, input.store_uuid),
    getPreviewItemsByIds(input.store_uuid, itemIds),
    getPreviewActiveBatchesForItems(input.store_uuid, itemIds),
  ]);

  assertStaffCannotApplyDiscounts({
    access: accessCtx.access,
    lines: normalized.items,
    discount_percent: input.discount_percent,
    final_total: input.final_total,
  });

  const useLineUnitDiscount = hasAnyUnitDiscount(normalized.items);

  let catalog_retail = 0;
  let catalog_display = 0;
  let custom_charges_total = 0;
  const lineDetails: {
    kind: "item" | "custom";
    item_id?: string;
    item_name: string;
    quantity: number;
    unit_price?: number;
    sufficient_stock: boolean;
    retail_subtotal: number;
    display_subtotal: number;
    unit_discount?: number;
    discountable: boolean;
    fifo_chunks: ReturnType<typeof fifoAllocateForBill>["chunks"];
  }[] = [];

  for (const line of normalized.items) {
    const item = itemsById.get(line.item_id);
    if (!item) throw new AppError(`Item not found: ${line.item_id}`, { statusCode: 404 });
    let alloc = isServiceItem(item.type)
      ? allocateServiceLine(item, line.quantity)
      : fifoAllocateForBill(batchesByItemId.get(line.item_id) ?? [], line.quantity);

    if (line.unit_discount != null) {
      try {
        alloc = applyUnitDiscountToAllocation(alloc, line.quantity, line.unit_discount);
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        throw new AppError(err.message || "Invalid unit_discount", { statusCode: 400 });
      }
    }

    catalog_retail += alloc.retail_subtotal;
    catalog_display += alloc.display_subtotal;
    lineDetails.push({
      kind: "item",
      item_id: line.item_id,
      item_name: item.name,
      quantity: line.quantity,
      sufficient_stock: alloc.ok,
      retail_subtotal: roundMoney(alloc.retail_subtotal),
      display_subtotal: roundMoney(alloc.display_subtotal),
      discountable: true,
      ...(line.unit_discount != null ? { unit_discount: roundMoney(Number(line.unit_discount)) } : {}),
      fifo_chunks: alloc.chunks,
    });
  }

  for (const line of normalized.customs) {
    const alloc = allocateCustomLine(line.unit_price, line.quantity);
    custom_charges_total += alloc.display_subtotal;
    lineDetails.push({
      kind: "custom",
      item_name: line.name,
      quantity: line.quantity,
      unit_price: roundMoney(line.unit_price),
      sufficient_stock: true,
      retail_subtotal: 0,
      display_subtotal: roundMoney(alloc.display_subtotal),
      discountable: false,
      fifo_chunks: alloc.chunks,
    });
  }

  catalog_retail = roundMoney(catalog_retail);
  catalog_display = roundMoney(catalog_display);
  custom_charges_total = roundMoney(custom_charges_total);

  const profit_total = roundMoney(Math.max(0, catalog_display - catalog_retail));
  const max_discount_percent = useLineUnitDiscount ? 0 : profit_total > 0 ? 100 : 0;

  let final_total_whatif: number | undefined;
  let implied_discount_percent: number | undefined;
  let discount_amount_whatif: number | undefined;

  if (useLineUnitDiscount) {
    const totals = computeBillTotals({
      catalog_retail,
      catalog_display,
      custom_charges_total,
      discount_percent: 0,
      unit_discount_mode: true,
    });
    final_total_whatif = totals.final_total;
    implied_discount_percent = 0;
    discount_amount_whatif = 0;
  } else if (input.discount_percent != null && Number.isFinite(input.discount_percent)) {
    const totals = computeBillTotals({
      catalog_retail,
      catalog_display,
      custom_charges_total,
      discount_percent: Number(input.discount_percent),
      unit_discount_mode: false,
    });
    implied_discount_percent = totals.discount_percent;
    final_total_whatif = totals.final_total;
    discount_amount_whatif = totals.discount_amount;
  } else if (input.final_total != null && Number.isFinite(input.final_total)) {
    // final_total is for the whole bill; back out implied catalog discount after subtracting fixed customs.
    const ft = roundMoney(input.final_total);
    final_total_whatif = ft;
    const catalog_target = roundMoney(ft - custom_charges_total);
    if (catalog_target < catalog_retail - 1e-6) {
      implied_discount_percent = undefined;
    } else if (profit_total > 0) {
      const clamped = Math.min(catalog_display, Math.max(catalog_target, catalog_retail));
      implied_discount_percent = roundMoney(((catalog_display - clamped) / profit_total) * 100);
    } else {
      implied_discount_percent = 0;
    }
    discount_amount_whatif = roundMoney(
      catalog_display - Math.min(catalog_display, Math.max(catalog_target, catalog_retail)),
    );
  }

  return {
    lines: lineDetails,
    retail_floor_total: catalog_retail,
    catalog_display_subtotal: catalog_display,
    custom_charges_total,
    display_subtotal_total: roundMoney(catalog_display + custom_charges_total),
    profit_total,
    max_discount_percent,
    unit_discount_mode: useLineUnitDiscount,
    overall_discount_ignored: useLineUnitDiscount,
    all_in_stock: lineDetails.every((l) => l.sufficient_stock),
    final_total_whatif,
    implied_discount_percent,
    discount_amount_whatif,
  };
}
