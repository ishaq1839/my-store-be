import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import {
  createInventoryItem,
  getInventoryItem,
  updateItemAfterBatchAdd,
} from "../../database/repos/inventoryItems.repo";
import { addBatch, aggregateBatches } from "../../database/repos/inventoryBatches.repo";
import { isServiceItem, type InventoryItemType } from "./inventoryItemTypes";
import { upsertStoreInventoryItem } from "./inventoryStoreCache";

export type CreateItemBatchInput = {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  item_id?: string;
  type?: InventoryItemType;
  name?: string;
  description?: string;
  retail_price: number;
  sale_price?: number | null;
  total_items?: number;
};

export async function createItemBatchService(input: CreateItemBatchInput) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);

  const sale_price =
    input.sale_price === undefined || input.sale_price === null ? null : Number(input.sale_price);

  if (!input.item_id) {
    const itemType = (input.type ?? "single") as InventoryItemType;
    const batchQuantity = isServiceItem(itemType) ? 0 : Number(input.total_items ?? 0);
    if (!isServiceItem(itemType) && batchQuantity <= 0) {
      throw new AppError("total_items must be a positive integer for single and carton items", { statusCode: 400 });
    }

    const { item, batch_id } = await createInventoryItem({
      store_uuid: input.store_uuid,
      type: itemType,
      name: String(input.name),
      description: String(input.description),
      created_by: input.actor.uuid,
      retail_price: input.retail_price,
      sale_price,
      batch_quantity: batchQuantity,
    });
    upsertStoreInventoryItem(input.store_uuid, item);
    return {
      item_id: item.uuid,
      batch_id,
      item,
      created_new_item: true,
    };
  }

  const existing = await getInventoryItem(input.store_uuid, input.item_id);
  if (!existing) throw new AppError("Item not found", { statusCode: 404 });

  const batchQuantity = isServiceItem(existing.type) ? 0 : Number(input.total_items ?? 0);
  if (!isServiceItem(existing.type) && batchQuantity <= 0) {
    throw new AppError("total_items must be a positive integer when adding stock", { statusCode: 400 });
  }
  if (isServiceItem(existing.type) && batchQuantity !== 0) {
    throw new AppError("total_items must be 0 when updating a service price", { statusCode: 400 });
  }

  const { batch } = await addBatch({
    store_uuid: input.store_uuid,
    item_id: input.item_id,
    created_by: input.actor.uuid,
    retail_price: input.retail_price,
    sale_price,
    quantity_total: batchQuantity,
  });

  if (isServiceItem(existing.type)) {
    await updateItemAfterBatchAdd({
      store_uuid: input.store_uuid,
      item_id: input.item_id,
      new_total_items: 0,
      current_retail_price: input.retail_price,
      current_sale_price: sale_price,
    });
  } else {
    const { total_remaining, newest_batch } = await aggregateBatches(input.store_uuid, input.item_id);
    await updateItemAfterBatchAdd({
      store_uuid: input.store_uuid,
      item_id: input.item_id,
      new_total_items: total_remaining,
      current_retail_price: newest_batch?.retail_price ?? batch.retail_price,
      current_sale_price: newest_batch?.sale_price ?? null,
    });
  }

  const updated = await getInventoryItem(input.store_uuid, input.item_id);
  if (updated) upsertStoreInventoryItem(input.store_uuid, updated);
  return {
    item_id: input.item_id,
    batch_id: batch.batch_id,
    item: updated,
    created_new_item: false,
  };
}
