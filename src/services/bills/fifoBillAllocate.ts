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

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mergeBillLines(lines: { item_id: string; quantity: number }[]): { item_id: string; quantity: number }[] {
  const map = new Map<string, number>();
  for (const l of lines) {
    const id = String(l.item_id).trim();
    if (!id) continue;
    const q = Math.floor(Number(l.quantity) || 0);
    if (q <= 0) continue;
    map.set(id, (map.get(id) ?? 0) + q);
  }
  return Array.from(map.entries()).map(([item_id, quantity]) => ({ item_id, quantity }));
}
