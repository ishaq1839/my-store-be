import { AppError } from "../../errors/AppError";
import { getUserByUuid } from "../../database/repos/users.repo";
import { createStore, type StoreRecord } from "../../database/repos/storesNew.repo";
import { buildEmailLower, buildFullNameLower, buildTrigrams, normalizeSpaces } from "../admin/users/searchTokens";

export type CreateStoreInput = {
  actor: { uuid: string; role?: string };
  name: string;
  address: string;
  description: string;
  status?: "active" | "inactive";
  subscription_status?: "free" | "subscribed";
};

export async function createStoreService(input: CreateStoreInput): Promise<StoreRecord> {
  const owner_id = String(input.actor.uuid);

  const owner = await getUserByUuid(owner_id);
  if (!owner) throw new AppError("owner_id not found", { statusCode: 404 });

  const owner_email_lower = buildEmailLower(owner.email);
  const owner_name_lower = buildFullNameLower(String(owner.firstname || ""), String(owner.lastname || ""));
  const name_lower = normalizeSpaces(input.name);
  const search_trigrams = buildTrigrams(`${name_lower} ${owner_name_lower} ${owner_email_lower}`);

  return createStore({
    owner_id,
    name: input.name,
    name_lower,
    owner_name_lower,
    owner_email_lower,
    search_trigrams,
    address: input.address,
    description: input.description,
    status: input.status || "active",
    subscription_status: input.subscription_status || "free",
  });
}

