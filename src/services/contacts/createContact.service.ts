import { createContact } from "../../database/repos/contacts.repo";

export type CreateContactInput = {
  owner_uuid: string;
  name: string;
  description: string;
  address?: string;
  contact_number?: string;
};

export async function createContactService(input: CreateContactInput) {
  return createContact(input);
}

