import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../firestoreAdmin";
import type { InventoryBatchRecord } from "./inventoryBatches.repo";
import type { InventoryItemRecord } from "./inventoryItems.repo";
import { fifoAllocateForBill, mergeBillLines, roundMoney } from "../../services/bills/fifoBillAllocate";
import { dailySummaryDocId, monthlySummaryDocId, weeklySummaryDocId } from "../../services/bills/summaryDocIds";

export type BillLineSnapshot = {
  item_id: string;
  item_name: string;
  quantity: number;
  retail_subtotal: number;
  display_subtotal: number;
  fifo_chunks: {
    batch_id: string;
    quantity: number;
    retail_price: number;
    sale_price: number | null;
    display_unit_price: number;
  }[];
};

export type BillRecord = {
  bill_id: string;
  store_uuid: string;
  created_at: string;
  created_by: string;
  lines: BillLineSnapshot[];
  discount_percent: number;
  discount_amount: number;
  display_subtotal_total: number;
  retail_floor_total: number;
  final_total: number;
};

function billsCol(store_uuid: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("bills");
}

function batchesCol(store_uuid: string, item_id: string) {
  return getDb()
    .collection("stores")
    .doc(String(store_uuid))
    .collection("items")
    .doc(String(item_id))
    .collection("batches");
}

function itemRef(store_uuid: string, item_id: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("items").doc(String(item_id));
}

function summaryRef(store_uuid: string, docId: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("sales_summary").doc(docId);
}

export async function listBillsInRange(opts: {
  store_uuid: string;
  from_iso: string;
  to_iso: string;
  limit: number;
  cursor?: { created_at: string; bill_id: string } | null;
}): Promise<{ bills: BillRecord[]; next_cursor: { created_at: string; bill_id: string } | null }> {
  const col = billsCol(opts.store_uuid);
  let q = col
    .where("created_at", ">=", opts.from_iso)
    .where("created_at", "<=", opts.to_iso)
    .orderBy("created_at", "desc")
    .orderBy("bill_id", "desc")
    .limit(opts.limit);

  if (opts.cursor?.created_at && opts.cursor.bill_id) {
    q = q.startAfter(opts.cursor.created_at, opts.cursor.bill_id);
  }

  const snap = await q.get();
  const bills = snap.docs.map((d) => d.data() as BillRecord);
  const last = bills[bills.length - 1];
  const next_cursor =
    last?.created_at && last.bill_id ? { created_at: String(last.created_at), bill_id: String(last.bill_id) } : null;
  return { bills, next_cursor };
}

export async function getSalesSummaryDoc(
  store_uuid: string,
  doc_id: string
): Promise<{ revenue: number; bill_count: number } | null> {
  const snap = await summaryRef(store_uuid, doc_id).get();
  if (!snap.exists) return null;
  const d = snap.data() as { revenue?: number; bill_count?: number };
  return {
    revenue: Number(d.revenue) || 0,
    bill_count: Number(d.bill_count) || 0,
  };
}

export type FinalizeBillInput = {
  store_uuid: string;
  created_by: string;
  lines: { item_id: string; quantity: number }[];
  discount_percent: number;
};

export type FinalizeBillResult = BillRecord;

const DISCOUNT_TOO_HIGH = "DISCOUNT_TOO_HIGH";
const INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";

export async function finalizeBillInTransaction(input: FinalizeBillInput): Promise<FinalizeBillResult> {
  const db = getDb();
  const merged = mergeBillLines(input.lines);
  if (!merged.length) {
    throw Object.assign(new Error("No valid line items"), { code: "EMPTY_LINES" });
  }

  const bill_id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const created_at = new Date().toISOString();
  const discount_percent = roundMoney(Number(input.discount_percent));

  return db.runTransaction(async (tx) => {
    const itemSnaps: Map<string, FirebaseFirestore.DocumentSnapshot> = new Map();
    const batchSnaps: Map<string, FirebaseFirestore.QuerySnapshot> = new Map();

    for (const line of merged) {
      const iRef = itemRef(input.store_uuid, line.item_id);
      const iSnap = await tx.get(iRef);
      if (!iSnap.exists) {
        throw Object.assign(new Error(`Item not found: ${line.item_id}`), { code: "ITEM_NOT_FOUND" });
      }
      itemSnaps.set(line.item_id, iSnap);

      const bSnap = await tx.get(batchesCol(input.store_uuid, line.item_id).orderBy("created_at", "asc"));
      batchSnaps.set(line.item_id, bSnap);
    }

    const dailyId = dailySummaryDocId(created_at);
    const weeklyId = weeklySummaryDocId(created_at);
    const monthlyId = monthlySummaryDocId(created_at);

    let retail_floor_total = 0;
    let display_subtotal_total = 0;
    const billLines: BillLineSnapshot[] = [];
    const batchUpdates: { ref: FirebaseFirestore.DocumentReference; newRem: number }[] = [];
    const itemUpdates: Map<
      string,
      { total_items: number; current_retail_price: number; current_sale_price: number | null }
    > = new Map();

    for (const line of merged) {
      const bSnap = batchSnaps.get(line.item_id)!;
      const batches: InventoryBatchRecord[] = bSnap.docs.map((d) => d.data() as InventoryBatchRecord);
      const alloc = fifoAllocateForBill(batches, line.quantity);

      if (!alloc.ok) {
        throw Object.assign(new Error(`Insufficient stock for item ${line.item_id}`), { code: INSUFFICIENT_STOCK });
      }

      retail_floor_total += alloc.retail_subtotal;
      display_subtotal_total += alloc.display_subtotal;

      const item = itemSnaps.get(line.item_id)!.data() as InventoryItemRecord;
      billLines.push({
        item_id: line.item_id,
        item_name: item.name || "",
        quantity: line.quantity,
        retail_subtotal: roundMoney(alloc.retail_subtotal),
        display_subtotal: roundMoney(alloc.display_subtotal),
        fifo_chunks: alloc.chunks.map((c) => ({
          batch_id: c.batch_id,
          quantity: c.quantity,
          retail_price: c.retail_price,
          sale_price: c.sale_price,
          display_unit_price: c.display_unit_price,
        })),
      });

      const takeByBatch = new Map<string, number>();
      for (const c of alloc.chunks) takeByBatch.set(c.batch_id, c.quantity);

      let newest: InventoryBatchRecord | null = null;
      for (const doc of bSnap.docs) {
        const data = doc.data() as InventoryBatchRecord;
        if (!newest || data.created_at > newest.created_at) newest = data;
        const rem = Math.max(0, Math.floor(Number(data.quantity_remaining) || 0));
        const take = takeByBatch.get(data.batch_id) ?? 0;
        const newRem = rem - take;
        if (take > 0) batchUpdates.push({ ref: doc.ref, newRem });
      }

      let totalRem = 0;
      for (const doc of bSnap.docs) {
        const data = doc.data() as InventoryBatchRecord;
        const rem = Math.max(0, Math.floor(Number(data.quantity_remaining) || 0));
        const take = takeByBatch.get(data.batch_id) ?? 0;
        totalRem += rem - take;
      }

      itemUpdates.set(line.item_id, {
        total_items: totalRem,
        current_retail_price: newest?.retail_price ?? 0,
        current_sale_price: newest?.sale_price ?? null,
      });
    }

    retail_floor_total = roundMoney(retail_floor_total);
    display_subtotal_total = roundMoney(display_subtotal_total);

    const profit_total = roundMoney(Math.max(0, display_subtotal_total - retail_floor_total));
    const dp = Math.max(0, Math.min(100, discount_percent));
    const final_total = roundMoney(retail_floor_total + profit_total * (1 - dp / 100));
    if (final_total < retail_floor_total - 1e-6) {
      throw Object.assign(new Error("Discount too high: final total would be below minimum retail floor"), {
        code: DISCOUNT_TOO_HIGH,
      });
    }

    for (const u of batchUpdates) {
      tx.update(u.ref, { quantity_remaining: u.newRem });
    }
    for (const [itemId, upd] of itemUpdates) {
      tx.update(itemRef(input.store_uuid, itemId), {
        total_items: upd.total_items,
        current_retail_price: upd.current_retail_price,
        current_sale_price: upd.current_sale_price,
      });
    }

    const bill: BillRecord = {
      bill_id,
      store_uuid: input.store_uuid,
      created_at,
      created_by: input.created_by,
      lines: billLines,
      discount_percent,
      discount_amount: roundMoney(display_subtotal_total - final_total),
      display_subtotal_total,
      retail_floor_total,
      final_total,
    };

    tx.set(billsCol(input.store_uuid).doc(bill_id), bill);

    const inc = { revenue: FieldValue.increment(final_total), bill_count: FieldValue.increment(1) };
    tx.set(summaryRef(input.store_uuid, dailyId), inc, { merge: true });
    tx.set(summaryRef(input.store_uuid, weeklyId), inc, { merge: true });
    tx.set(summaryRef(input.store_uuid, monthlyId), inc, { merge: true });

    return bill;
  });
}
