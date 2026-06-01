import { AppError } from "../../errors/AppError";
import { getStoreByUuid } from "../../database/repos/storesNew.repo";

export async function assertCanManageStoreInventory(actor: { uuid: string; role?: string }, store_uuid: string) {
  const store = await getStoreByUuid(String(store_uuid));
  if (!store) throw new AppError("Store not found", { statusCode: 404 });
  const role = String(actor.role || "").toLowerCase();
  if (role === "admin") return store;
  if (String(store.owner_id) !== String(actor.uuid)) {
    throw new AppError("Forbidden", { statusCode: 403 });
  }
  return store;
}
