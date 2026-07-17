import { AppError } from "../../errors/AppError";
import { getStoreByUuid, type StoreRecord } from "../../database/repos/storesNew.repo";
import { getUserStoreMembership } from "../../database/repos/storeStaff.repo";

export type StoreAccessLevel = "admin" | "owner" | "staff";

export type StoreAccessContext = {
  store: StoreRecord;
  access: StoreAccessLevel;
};

async function resolveStoreAccess(
  actor: { uuid: string; role?: string },
  store_uuid: string,
): Promise<StoreAccessContext> {
  const store = await getStoreByUuid(String(store_uuid));
  if (!store) throw new AppError("Store not found", { statusCode: 404 });

  const role = String(actor.role || "").toLowerCase();
  if (role === "admin") return { store, access: "admin" };
  if (String(store.owner_id) === String(actor.uuid)) return { store, access: "owner" };

  const membership = await getUserStoreMembership(actor.uuid, store_uuid);
  if (membership?.store_role === "staff") return { store, access: "staff" };

  throw new AppError("Forbidden", { statusCode: 403 });
}

/** Owner or platform admin — full store management. */
export async function assertCanManageStoreInventory(
  actor: { uuid: string; role?: string },
  store_uuid: string,
): Promise<StoreRecord> {
  const ctx = await resolveStoreAccess(actor, store_uuid);
  if (ctx.access === "staff") throw new AppError("Forbidden", { statusCode: 403 });
  return ctx.store;
}

/** Owner, admin, or store staff — sell / preview / finalize bills. */
export async function assertCanSellAtStore(
  actor: { uuid: string; role?: string },
  store_uuid: string,
): Promise<StoreAccessContext> {
  return resolveStoreAccess(actor, store_uuid);
}

/** Store owner only (admin also allowed) — manage staff. */
export async function assertCanManageStoreStaff(
  actor: { uuid: string; role?: string },
  store_uuid: string,
): Promise<StoreRecord> {
  return assertCanManageStoreInventory(actor, store_uuid);
}

export function assertStaffCannotApplyDiscounts(input: {
  access: StoreAccessLevel;
  lines: Array<{ kind?: string; unit_discount?: number }>;
  discount_percent?: number;
  final_total?: number;
}): void {
  if (input.access !== "staff") return;

  const hasUnitDiscount = input.lines.some(
    (l) => l.kind !== "custom" && l.unit_discount != null && Number.isFinite(Number(l.unit_discount)),
  );
  if (hasUnitDiscount) {
    throw new AppError("Staff cannot override unit prices or apply discounts", { statusCode: 403 });
  }

  if (input.discount_percent != null && Number(input.discount_percent) > 0) {
    throw new AppError("Staff cannot override unit prices or apply discounts", { statusCode: 403 });
  }

  if (input.final_total != null) {
    throw new AppError("Staff cannot override unit prices or apply discounts", { statusCode: 403 });
  }
}
