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

export type BillLineInput = {
  item_id: string;
  quantity: number;
  /** Optional per-unit selling price override (must be >= retail floor for the line). */
  unit_discount?: number;
};

function displayUnitPrice(retail: number, sale: number | null): number {
  const r = Number(retail) || 0;
  const s = sale != null && Number.isFinite(Number(sale)) ? Number(sale) : null;
  if (s != null && s > r) return s;
  return r;
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
 * Apply optional per-line unit selling price override.
 * Returns display_subtotal = unit_discount * quantity, and chunks with that unit price.
 * Throws if unit_discount * qty is below retail floor for the allocated line.
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
  if (display_subtotal + 1e-6 < alloc.retail_subtotal) {
    throw Object.assign(
      new Error(
        `unit_discount too low: line total ${display_subtotal} is below retail floor ${roundMoney(alloc.retail_subtotal)}`
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

export function mergeBillLines(lines: BillLineInput[]): BillLineInput[] {
  const map = new Map<string, { quantity: number; unit_discount?: number }>();
  for (const l of lines) {
    const id = String(l.item_id).trim();
    if (!id) continue;
    const q = Math.floor(Number(l.quantity) || 0);
    if (q <= 0) continue;

    const ud =
      l.unit_discount != null && Number.isFinite(Number(l.unit_discount))
        ? roundMoney(Number(l.unit_discount))
        : undefined;

    const existing = map.get(id);
    if (!existing) {
      map.set(id, { quantity: q, unit_discount: ud });
      continue;
    }

    if (ud != null && existing.unit_discount != null && Math.abs(ud - existing.unit_discount) > 1e-6) {
      throw Object.assign(
        new Error(`Conflicting unit_discount for item ${id}`),
        { code: "UNIT_DISCOUNT_CONFLICT" }
      );
    }

    existing.quantity += q;
    if (ud != null) existing.unit_discount = ud;
  }

  return Array.from(map.entries()).map(([item_id, v]) => ({
    item_id,
    quantity: v.quantity,
    ...(v.unit_discount != null ? { unit_discount: v.unit_discount } : {}),
  }));
}

/** True if any line carries a per-item unit_discount override. */
export function hasAnyUnitDiscount(lines: BillLineInput[]): boolean {
  return lines.some((l) => l.unit_discount != null && Number.isFinite(Number(l.unit_discount)));
}
