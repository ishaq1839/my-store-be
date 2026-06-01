import { listContactsByOwner } from "../../database/repos/contacts.repo";

export async function listContactsService(owner_uuid: string) {
  return listContactsByOwner(owner_uuid);
}

