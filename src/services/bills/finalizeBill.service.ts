import { AppError } from "../../errors/AppError";
import {
  assertCanSellAtStore,
  assertStaffCannotApplyDiscounts,
} from "../inventory/assertStoreInventoryAccess.service";
import { invalidateStoreInventoryCache } from "../inventory/inventoryStoreCache";
import { finalizeBillInTransaction } from "../../database/repos/bills.repo";
import { getUserByUuid } from "../../database/repos/users.repo";
import type { BillLineInput } from "./fifoBillAllocate";

export async function finalizeBillService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  lines: BillLineInput[];
  discount_percent: number;
  username?: string;
  phone_number?: string;
}) {
  const accessCtx = await assertCanSellAtStore(input.actor, input.store_uuid);

  assertStaffCannotApplyDiscounts({
    access: accessCtx.access,
    lines: input.lines,
    discount_percent: input.discount_percent,
  });

  const seller = await getUserByUuid(input.actor.uuid);
  const seller_name = seller
    ? `${String(seller.firstname || "").trim()} ${String(seller.lastname || "").trim()}`.trim()
    : undefined;

  try {
    const bill = await finalizeBillInTransaction({
      store_uuid: input.store_uuid,
      created_by: input.actor.uuid,
      seller_id: input.actor.uuid,
      seller_email: seller?.email,
      seller_name: seller_name || undefined,
      lines: input.lines,
      discount_percent: accessCtx.access === "staff" ? 0 : input.discount_percent,
      username: input.username,
      phone_number: input.phone_number,
    });
    invalidateStoreInventoryCache(input.store_uuid);
    return bill;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "DISCOUNT_TOO_HIGH") {
      throw new AppError(err.message || "Discount too high for this bill", { statusCode: 400 });
    }
    if (err.code === "INSUFFICIENT_STOCK") {
      throw new AppError(err.message || "Insufficient stock", { statusCode: 400 });
    }
    if (err.code === "ITEM_NOT_FOUND") {
      throw new AppError(err.message || "Item not found", { statusCode: 404 });
    }
    if (err.code === "EMPTY_LINES") {
      throw new AppError("No valid line items", { statusCode: 400 });
    }
    if (
      err.code === "UNIT_DISCOUNT_BELOW_RETAIL" ||
      err.code === "INVALID_UNIT_DISCOUNT" ||
      err.code === "UNIT_DISCOUNT_CONFLICT"
    ) {
      throw new AppError(err.message || "Invalid unit_discount", { statusCode: 400 });
    }
    throw e;
  }
}
