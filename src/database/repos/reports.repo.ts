import { getDb } from "../firestoreAdmin";

export type StoreSummaryRecord = {
  revenue: number;
  bill_count: number;
  profit_after_discount: number;
  quantity_sold: number;
};

export type ItemSummaryRecord = {
  item_id: string;
  item_name: string;
  quantity_sold: number;
  revenue: number;
  profit_after_discount: number;
};

export type StaffSummaryRecord = {
  seller_id: string;
  seller_email: string;
  seller_name: string;
  bill_count: number;
  revenue: number;
  profit_after_discount: number;
  quantity_sold: number;
};

function storeSummaryRef(store_uuid: string, periodDocId: string) {
  return getDb().collection("stores").doc(String(store_uuid)).collection("sales_summary").doc(periodDocId);
}

function itemSummaryCol(store_uuid: string, periodDocId: string) {
  return getDb()
    .collection("stores")
    .doc(String(store_uuid))
    .collection("item_sales_summary")
    .doc(periodDocId)
    .collection("items");
}

function staffSummaryCol(store_uuid: string, periodDocId: string) {
  return getDb()
    .collection("stores")
    .doc(String(store_uuid))
    .collection("staff_sales_summary")
    .doc(periodDocId)
    .collection("sellers");
}

function emptyStoreSummary(): StoreSummaryRecord {
  return { revenue: 0, bill_count: 0, profit_after_discount: 0, quantity_sold: 0 };
}

export async function getStoreSummaryRecord(
  store_uuid: string,
  period_doc_id: string
): Promise<StoreSummaryRecord> {
  const snap = await storeSummaryRef(store_uuid, period_doc_id).get();
  if (!snap.exists) return emptyStoreSummary();

  const d = snap.data() as Partial<StoreSummaryRecord>;
  return {
    revenue: Number(d.revenue) || 0,
    bill_count: Number(d.bill_count) || 0,
    profit_after_discount: Number(d.profit_after_discount) || 0,
    quantity_sold: Number(d.quantity_sold) || 0,
  };
}

export async function listItemSummaryRecords(
  store_uuid: string,
  period_doc_id: string
): Promise<ItemSummaryRecord[]> {
  const snap = await itemSummaryCol(store_uuid, period_doc_id).get();
  return snap.docs.map((doc) => {
    const d = doc.data() as Partial<ItemSummaryRecord>;
    return {
      item_id: String(d.item_id || doc.id),
      item_name: String(d.item_name || ""),
      quantity_sold: Number(d.quantity_sold) || 0,
      revenue: Number(d.revenue) || 0,
      profit_after_discount: Number(d.profit_after_discount) || 0,
    };
  });
}

export async function listStaffSummaryRecords(
  store_uuid: string,
  period_doc_id: string
): Promise<StaffSummaryRecord[]> {
  const snap = await staffSummaryCol(store_uuid, period_doc_id).get();
  return snap.docs.map((doc) => {
    const d = doc.data() as Partial<StaffSummaryRecord>;
    return {
      seller_id: String(d.seller_id || doc.id),
      seller_email: String(d.seller_email || ""),
      seller_name: String(d.seller_name || ""),
      bill_count: Number(d.bill_count) || 0,
      revenue: Number(d.revenue) || 0,
      profit_after_discount: Number(d.profit_after_discount) || 0,
      quantity_sold: Number(d.quantity_sold) || 0,
    };
  });
}
