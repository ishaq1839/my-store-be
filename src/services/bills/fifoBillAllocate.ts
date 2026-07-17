import type { InventoryBatchRecord } from "../../database/repos/inventoryBatches.repo";

export type BillFifoChunk = {
  batch_id: string;
  quantity: number;
  retail_price: number;
  sale_price: number | null;
  display_unit_price: number;
  line_retail_subtotal: number;
  line_display_subtotal: number;
};

export type InventoryBillLineInput = {
  kind?: "item";
  item_id: string;
  quantity: number;
  /** Optional per-unit selling rate override (discount or markup). Floor: retail. No ceiling. */
  unit_discount?: number;
};

export type CustomBillLineInput = {
  kind: "custom";
  name: string;
  quantity: number;
  unit_price: number;
};

export type BillLineInput = InventoryBillLineInput | CustomBillLineInput;

/** @deprecated use InventoryBillLineInput — kept for callers that only pass catalog lines */
export type BillLineInputLegacy = InventoryBillLineInput;

function displayUnitPrice(retail: number, sale: number | null): number {
  const r = Number(retail) || 0;
  const s = sale != null && Number.isFinite(Number(sale)) ? Number(sale) : null;
  if (s != null && s > r) return s;
  return r;
}

export function isCustomBillLine(line: BillLineInput): line is CustomBillLineInput {
  return line.kind === "custom";
}

/** Fixed custom charge — never participates in discounts. */
export function allocateCustomLine(
  unit_price: number,
  quantity: number,
): ReturnType<typeof fifoAllocateForBill> {
  if (quantity <= 0) {
    return { ok: true, chunks: [], retail_subtotal: 0, display_subtotal: 0 };
  }
  const price = roundMoney(Number(unit_price));
  const display_subtotal = roundMoney(price * quantity);
  return {
    ok: true,
    // retail 0 so custom never raises the catalog retail floor / discount base
    retail_subtotal: 0,
    display_subtotal,
    chunks: [
      {
        batch_id: "custom",
        quantity,
        retail_price: 0,
        sale_price: price,
        display_unit_price: price,
        line_retail_subtotal: 0,
        line_display_subtotal: display_subtotal,
      },
    ],
  };
}

/** Read-only allocation for service lines (no stock tracking). */
export function allocateServiceLine(
  item: { current_retail_price: number; current_sale_price: number | null },
  quantity: number,
): ReturnType<typeof fifoAllocateForBill> {
  if (quantity <= 0) {
    return { ok: true, chunks: [], retail_subtotal: 0, display_subtotal: 0 };
  }

  const retail = Number(item.current_retail_price) || 0;
  const display = displayUnitPrice(retail, item.current_sale_price != null ? Number(item.current_sale_price) : null);
  const retail_subtotal = quantity * retail;
  const display_subtotal = quantity * display;

  return {
    ok: true,
    chunks: [
      {
        batch_id: "service",
        quantity,
        retail_price: retail,
        sale_price: item.current_sale_price,
        display_unit_price: display,
        line_retail_subtotal: retail_subtotal,
        line_display_subtotal: display_subtotal,
      },
    ],
    retail_subtotal,
    display_subtotal,
  };
}

/** Read-only FIFO allocation for bill pricing and stock check. */
export function fifoAllocateForBill(batchesAsc: InventoryBatchRecord[], quantity: number): {
  ok: boolean;
  chunks: BillFifoChunk[];
  retail_subtotal: number;
  display_subtotal: number;
} {
  if (quantity <= 0) {
    return { ok: true, chunks: [], retail_subtotal: 0, display_subtotal: 0 };
  }

  let remaining = quantity;
  const chunks: BillFifoChunk[] = [];
  let retail_subtotal = 0;
  let display_subtotal = 0;

  for (const b of batchesAsc) {
    if (remaining <= 0) break;
    const rem = Math.max(0, Math.floor(Number(b.quantity_remaining) || 0));
    if (rem <= 0) continue;
    const take = Math.min(rem, remaining);
    const retail = Number(b.retail_price) || 0;
    const display = displayUnitPrice(retail, b.sale_price != null ? Number(b.sale_price) : null);
    const lr = take * retail;
    const ld = take * display;
    retail_subtotal += lr;
    display_subtotal += ld;
    chunks.push({
      batch_id: b.batch_id,
      quantity: take,
      retail_price: retail,
      sale_price: b.sale_price,
      display_unit_price: display,
      line_retail_subtotal: lr,
      line_display_subtotal: ld,
    });
    remaining -= take;
  }

  return {
    ok: remaining === 0,
    chunks,
    retail_subtotal,
    display_subtotal,
  };
}

/**
 * Apply optional per-line unit selling rate (`unit_discount` field name).
 * Charge = unit_discount × quantity (replaces list sale for that line).
 * Floor: line total must be >= FIFO retail floor (cannot go below retail).
 * Ceiling: none — values above list sale are allowed (markup).
 */
export function applyUnitDiscountToAllocation(
  alloc: ReturnType<typeof fifoAllocateForBill>,
  quantity: number,
  unit_discount: number
): ReturnType<typeof fifoAllocateForBill> {
  const ud = roundMoney(Number(unit_discount));
  if (!(ud > 0) || !Number.isFinite(ud)) {
    throw Object.assign(new Error("unit_discount must be a positive number"), { code: "INVALID_UNIT_DISCOUNT" });
  }

  const display_subtotal = roundMoney(ud * quantity);
  const retail_floor = roundMoney(alloc.retail_subtotal);
  if (display_subtotal + 1e-6 < retail_floor) {
    const retail_unit = quantity > 0 ? roundMoney(retail_floor / quantity) : retail_floor;
    throw Object.assign(
      new Error(
        `unit_discount too low: ${ud} is below retail floor ${retail_unit} (line total ${display_subtotal} < ${retail_floor})`
      ),
      { code: "UNIT_DISCOUNT_BELOW_RETAIL" }
    );
  }

  return {
    ok: alloc.ok,
    retail_subtotal: alloc.retail_subtotal,
    display_subtotal,
    chunks: alloc.chunks.map((c) => ({
      ...c,
      display_unit_price: ud,
      line_display_subtotal: roundMoney(ud * c.quantity),
    })),
  };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalizeBillLines(lines: BillLineInput[]): {
  items: InventoryBillLineInput[];
  customs: CustomBillLineInput[];
} {
  const itemMap = new Map<string, { quantity: number; unit_discount?: number }>();
  const customMap = new Map<string, { name: string; quantity: number; unit_price: number }>();

  for (const l of lines) {
    const q = Math.floor(Number(l.quantity) || 0);
    if (q <= 0) continue;

    if (isCustomBillLine(l)) {
      const name = String(l.name || "").trim();
      const unit_price = roundMoney(Number(l.unit_price));
      if (!name || !(unit_price > 0)) continue;
      const key = `${name.toLowerCase()}|${unit_price}`;
      const existing = customMap.get(key);
      if (!existing) customMap.set(key, { name, quantity: q, unit_price });
      else existing.quantity += q;
      continue;
    }

    const id = String(l.item_id || "").trim();
    if (!id) continue;

    const ud =
      l.unit_discount != null && Number.isFinite(Number(l.unit_discount))
        ? roundMoney(Number(l.unit_discount))
        : undefined;

    const existing = itemMap.get(id);
    if (!existing) {
      itemMap.set(id, { quantity: q, unit_discount: ud });
      continue;
    }

    if (ud != null && existing.unit_discount != null && Math.abs(ud - existing.unit_discount) > 1e-6) {
      throw Object.assign(new Error(`Conflicting unit_discount for item ${id}`), {
        code: "UNIT_DISCOUNT_CONFLICT",
      });
    }

    existing.quantity += q;
    if (ud != null) existing.unit_discount = ud;
  }

  return {
    items: Array.from(itemMap.entries()).map(([item_id, v]) => ({
      kind: "item" as const,
      item_id,
      quantity: v.quantity,
      ...(v.unit_discount != null ? { unit_discount: v.unit_discount } : {}),
    })),
    customs: Array.from(customMap.values()).map((v) => ({
      kind: "custom" as const,
      name: v.name,
      quantity: v.quantity,
      unit_price: v.unit_price,
    })),
  };
}

/** Merge catalog item lines only (legacy helper). */
export function mergeBillLines(lines: InventoryBillLineInput[]): InventoryBillLineInput[] {
  return normalizeBillLines(lines).items;
}

/** True if any catalog line carries a per-item unit rate override (`unit_discount`). */
export function hasAnyUnitDiscount(lines: Array<{ unit_discount?: number; kind?: string }>): boolean {
  return lines.some(
    (l) => l.kind !== "custom" && l.unit_discount != null && Number.isFinite(Number(l.unit_discount)),
  );
}

/** Apply overall discount to catalog only; custom charges stay fixed. */
export function computeBillTotals(input: {
  catalog_retail: number;
  catalog_display: number;
  custom_charges_total: number;
  discount_percent: number;
  unit_discount_mode: boolean;
}): {
  retail_floor_total: number;
  catalog_display_subtotal: number;
  custom_charges_total: number;
  display_subtotal_total: number;
  profit_total: number;
  discount_percent: number;
  discount_amount: number;
  final_total: number;
} {
  const catalog_retail = roundMoney(input.catalog_retail);
  const catalog_display = roundMoney(input.catalog_display);
  const custom_charges_total = roundMoney(input.custom_charges_total);
  const profit_total = roundMoney(Math.max(0, catalog_display - catalog_retail));
  const discount_percent = input.unit_discount_mode ? 0 : Math.max(0, Math.min(100, Number(input.discount_percent) || 0));
  const catalog_final = roundMoney(catalog_retail + profit_total * (1 - discount_percent / 100));
  const discount_amount = roundMoney(catalog_display - catalog_final);
  const final_total = roundMoney(catalog_final + custom_charges_total);

  return {
    retail_floor_total: catalog_retail,
    catalog_display_subtotal: catalog_display,
    custom_charges_total,
    display_subtotal_total: roundMoney(catalog_display + custom_charges_total),
    profit_total,
    discount_percent: roundMoney(discount_percent),
    discount_amount,
    final_total,
  };
}
