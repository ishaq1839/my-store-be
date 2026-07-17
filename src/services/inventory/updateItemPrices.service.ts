import { AppError } from "../../errors/AppError";
import { getInventoryItem } from "../../database/repos/inventoryItems.repo";
import { repriceItemBatchesInTransaction } from "../../database/repos/inventoryBatches.repo";
import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import { isServiceItem } from "./inventoryItemTypes";
import { upsertStoreInventoryItem } from "./inventoryStoreCache";

export async function updateItemPricesService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  item_id: string;
  retail_price: number;
  sale_price?: number | null;
  total_items?: number;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const item = await getInventoryItem(input.store_uuid, input.item_id);
  if (!item) throw new AppError("Item not found", { statusCode: 404 });

  const sale_price =
    input.sale_price === undefined || input.sale_price === null ? null : Number(input.sale_price);

  if (isServiceItem(item.type) && input.total_items != null && Number(input.total_items) !== 0) {
    throw new AppError("total_items must be 0 for service items", { statusCode: 400 });
  }

  const previous_retail_price = Number(item.current_retail_price) || 0;
  const previous_sale_price =
    item.current_sale_price != null && Number.isFinite(Number(item.current_sale_price))
      ? Number(item.current_sale_price)
      : null;
  const previous_quantity = Number(item.total_items) || 0;

  try {
    const result = await repriceItemBatchesInTransaction({
      store_uuid: input.store_uuid,
      item_id: input.item_id,
      created_by: input.actor.uuid,
      retail_price: input.retail_price,
      sale_price,
      is_service: isServiceItem(item.type),
      total_items: input.total_items,
    });

    const updated = await getInventoryItem(input.store_uuid, input.item_id);
    if (!updated) throw new AppError("Item not found after price update", { statusCode: 500 });
    upsertStoreInventoryItem(input.store_uuid, updated);

    return {
      item_id: input.item_id,
      batch_id: result.batch_id,
      repriced_quantity: result.repriced_quantity,
      previous_quantity: result.previous_quantity || previous_quantity,
      previous_retail_price,
      previous_sale_price,
      current_retail_price: updated.current_retail_price,
      current_sale_price: updated.current_sale_price,
      total_items: updated.total_items,
      item: updated,
    };
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "ITEM_NOT_FOUND") {
      throw new AppError("Item not found", { statusCode: 404 });
    }
    throw e;
  }
}
