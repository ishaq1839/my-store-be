import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { listBillsInRange, type BillRecord } from "../../database/repos/bills.repo";

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

function normalizeSearch(v?: string): string {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function digitsOnly(v?: string): string {
  return String(v || "").replace(/\D+/g, "");
}

function matchesBillFilters(
  bill: BillRecord,
  filters: { seller_name?: string; customer_name?: string; phone_number?: string },
): boolean {
  const sellerQ = normalizeSearch(filters.seller_name);
  if (sellerQ) {
    const sellerName = normalizeSearch(bill.seller_name);
    const sellerEmail = normalizeSearch(bill.seller_email);
    if (!sellerName.includes(sellerQ) && !sellerEmail.includes(sellerQ)) return false;
  }

  const customerQ = normalizeSearch(filters.customer_name);
  if (customerQ) {
    const customerName = normalizeSearch(bill.username);
    if (!customerName.includes(customerQ)) return false;
  }

  const phoneQ = digitsOnly(filters.phone_number);
  if (phoneQ) {
    const phone = digitsOnly(bill.phone_number);
    if (!phone.includes(phoneQ)) return false;
  }

  return true;
}

export type BillListItem = {
  bill_id: string;
  final_total: number;
  username: string;
  created_at: string;
};

export async function listBillsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  from: string;
  to: string;
  limit: number;
  cursor?: string;
  seller_name?: string;
  customer_name?: string;
  phone_number?: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const from_iso = input.from.includes("T") ? input.from : `${input.from}T00:00:00.000Z`;
  const to_iso = input.to.includes("T") ? input.to : `${input.to}T23:59:59.999Z`;
  const hasTextFilter = Boolean(
    normalizeSearch(input.seller_name) ||
      normalizeSearch(input.customer_name) ||
      digitsOnly(input.phone_number),
  );

  let cursor = decodeCursor(String(input.cursor || ""));
  const matched: BillRecord[] = [];
  let safety = 0;

  while (matched.length < input.limit && safety < 12) {
    safety += 1;
    const page = await listBillsInRange({
      store_uuid: input.store_uuid,
      from_iso,
      to_iso,
      limit: hasTextFilter ? Math.max(input.limit * 3, 30) : input.limit,
      cursor,
    });

    for (const bill of page.bills) {
      if (
        matchesBillFilters(bill, {
          seller_name: input.seller_name,
          customer_name: input.customer_name,
          phone_number: input.phone_number,
        })
      ) {
        matched.push(bill);
        if (matched.length >= input.limit) break;
      }
    }

    cursor = page.next_cursor;
    if (!page.next_cursor || page.bills.length === 0) break;
    if (!hasTextFilter) break;
  }

  const pageBills = matched.slice(0, input.limit);
  const last = pageBills[pageBills.length - 1];

  return {
    bills: pageBills.map(
      (b): BillListItem => ({
        bill_id: b.bill_id,
        final_total: Number(b.final_total) || 0,
        username: b.username ? String(b.username) : "",
        created_at: String(b.created_at || ""),
      }),
    ),
    next_cursor:
      pageBills.length === input.limit && last?.created_at && last.bill_id
        ? encodeCursor({ created_at: String(last.created_at), bill_id: String(last.bill_id) })
        : null,
  };
}
