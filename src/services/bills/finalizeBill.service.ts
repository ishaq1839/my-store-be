import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";
import { finalizeBillInTransaction } from "../../database/repos/bills.repo";

export async function finalizeBillService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  lines: { item_id: string; quantity: number }[];
  discount_percent: number;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  try {
    return await finalizeBillInTransaction({
      store_uuid: input.store_uuid,
      created_by: input.actor.uuid,
      lines: input.lines,
      discount_percent: input.discount_percent,
    });
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
    throw e;
  }
}
