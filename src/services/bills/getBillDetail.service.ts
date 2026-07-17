import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { getBillById } from "../../database/repos/bills.repo";

export async function getBillDetailService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  bill_id: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const bill = await getBillById(input.store_uuid, input.bill_id);
  if (!bill) throw new AppError("Bill not found", { statusCode: 404 });

  return {
    bill_id: bill.bill_id,
    store_uuid: bill.store_uuid,
    created_at: bill.created_at,
    created_by: bill.created_by,
    seller_id: bill.seller_id || bill.created_by,
    seller_email: bill.seller_email || "",
    seller_name: bill.seller_name || "",
    username: bill.username || "",
    phone_number: bill.phone_number || "",
    discount_percent: bill.discount_percent,
    discount_amount: bill.discount_amount,
    display_subtotal_total: bill.display_subtotal_total,
    retail_floor_total: bill.retail_floor_total,
    final_total: bill.final_total,
    custom_charges_total: Number(bill.custom_charges_total) || 0,
    unit_discount_mode: Boolean(bill.unit_discount_mode),
    lines: bill.lines,
  };
}
