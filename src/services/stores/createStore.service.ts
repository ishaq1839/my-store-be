import { AppError } from "../../errors/AppError";
import { getUserByUuid } from "../../database/repos/users.repo";
import { createStore, type StoreRecord } from "../../database/repos/storesNew.repo";
import { assignStoreToUser } from "../../database/repos/stores.repo";
import { buildEmailLower, buildFullNameLower, buildTrigrams, normalizeSpaces } from "../admin/users/searchTokens";

export type CreateStoreInput = {
  actor: { uuid: string; role?: string };
  name: string;
  address: string;
  description: string;
  status?: "active" | "inactive";
  subscription_status?: "free" | "subscribed";
  /** Admin only: assign store ownership to another user. */
  owner_id?: string;
};

export async function createStoreService(input: CreateStoreInput): Promise<StoreRecord> {
  const actorRole = String(input.actor.role || "").toLowerCase();
  if (actorRole === "staff") {
    throw new AppError("Staff cannot create stores", { statusCode: 403 });
  }

  const requestedOwnerId = input.owner_id ? String(input.owner_id).trim() : "";

  let owner_id = String(input.actor.uuid);
  if (requestedOwnerId && requestedOwnerId !== owner_id) {
    if (actorRole !== "admin") {
      throw new AppError("Only admin can assign a store to another user", { statusCode: 403 });
    }
    owner_id = requestedOwnerId;
  }

  const owner = await getUserByUuid(owner_id);
  if (!owner) throw new AppError("owner_id not found", { statusCode: 404 });

  const owner_email_lower = buildEmailLower(owner.email);
  const owner_name_lower = buildFullNameLower(String(owner.firstname || ""), String(owner.lastname || ""));
  const name_lower = normalizeSpaces(input.name);
  const search_trigrams = buildTrigrams(`${name_lower} ${owner_name_lower} ${owner_email_lower}`);

  const created = await createStore({
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

  // Keep login store resolution working for owned + assigned stores.
  await assignStoreToUser({
    user_uuid: owner_id,
    store_uuid: created.uuid,
    store_role: "owner",
    email: owner.email,
    firstname: owner.firstname,
    lastname: owner.lastname,
  });

  return created;
}
