import { listContactsByStore } from "../../database/repos/contacts.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";

export async function listContactsService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
}) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  return listContactsByStore(input.store_uuid);
}
