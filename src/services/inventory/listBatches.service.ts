import { AppError } from "../../errors/AppError";
import { assertCanManageStoreInventory } from "./assertStoreInventoryAccess.service";
import { getInventoryItem } from "../../database/repos/inventoryItems.repo";
import { listBatchesDesc } from "../../database/repos/inventoryBatches.repo";

export async function listBatchesService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  item_id: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  const item = await getInventoryItem(input.store_uuid, input.item_id);
  if (!item) throw new AppError("Item not found", { statusCode: 404 });
  const batches = await listBatchesDesc(input.store_uuid, input.item_id);
  return { item_id: input.item_id, batches };
}
