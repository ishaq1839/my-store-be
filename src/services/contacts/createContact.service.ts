import { createContact } from "../../database/repos/contacts.repo";
import { assertCanManageStoreInventory } from "../inventory/assertStoreInventoryAccess.service";

export type CreateContactInput = {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  name: string;
  description: string;
  address?: string;
  contact_number?: string;
};

export async function createContactService(input: CreateContactInput) {
  await assertCanManageStoreInventory(input.actor, input.store_uuid);
  return createContact({
    owner_uuid: input.actor.uuid,
    store_uuid: input.store_uuid,
    name: input.name,
    description: input.description,
    address: input.address,
    contact_number: input.contact_number,
  });
}
