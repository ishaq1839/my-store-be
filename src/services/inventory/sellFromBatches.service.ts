import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import { getInventoryItem } from "../../database/repos/inventoryItems.repo";
import { sellFifoFromBatches } from "../../database/repos/inventoryBatches.repo";

export async function sellFromBatchesService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  item_id: string;
  quantity: number;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const item = await getInventoryItem(input.store_uuid, input.item_id);
  if (!item) throw new AppError("Item not found", { statusCode: 404 });

  try {
    const result = await sellFifoFromBatches({
      store_uuid: input.store_uuid,
      item_id: input.item_id,
      quantity: input.quantity,
    });
    return {
      item_id: input.item_id,
      store_uuid: input.store_uuid,
      requested_quantity: input.quantity,
      sold: result.sold,
      batches: result.batches.map((b) => ({
        batch_id: b.batch_id,
        quantity: b.quantity,
        retail_price: b.retail_price,
        sale_price: b.sale_price ?? b.retail_price,
      })),
      remaining_total: result.remaining_total,
    };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "INSUFFICIENT_STOCK") {
      throw new AppError("Not enough stock for this item", { statusCode: 400 });
    }
    throw e;
  }
}
