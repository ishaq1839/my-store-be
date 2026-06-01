import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { listBillsInRange } from "../../database/repos/bills.repo";

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

export async function listBillsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  from: string;
  to: string;
  limit: number;
  cursor?: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const from_iso = input.from.includes("T") ? input.from : `${input.from}T00:00:00.000Z`;
  const to_iso = input.to.includes("T") ? input.to : `${input.to}T23:59:59.999Z`;

  const cursor = decodeCursor(String(input.cursor || ""));
  const res = await listBillsInRange({
    store_uuid: input.store_uuid,
    from_iso,
    to_iso,
    limit: input.limit,
    cursor,
  });

  return {
    bills: res.bills,
    next_cursor: res.next_cursor ? encodeCursor(res.next_cursor) : null,
  };
}
