import { AppError } from "../../errors/AppError";
import { createAuthUser, deleteAuthUser, getAuthUserByEmail } from "../../database/repos/firebaseAuth.repo";
import { createUser, getUserByEmail } from "../../database/repos/users.repo";
import { assignStoreToUser, listStaffMembershipsForStore, removeStaffFromStore } from "../../database/repos/storeStaff.repo";
import { buildEmailLower, buildFullNameLower, buildTrigrams } from "../admin/users/searchTokens";
import { assertCanManageStoreStaff } from "../inventory/assertStoreInventoryAccess.service";

export async function createStoreStaffService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
}) {
  await assertCanManageStoreStaff(input.actor, input.store_uuid);

  const normalizedEmail = String(input.email).trim().toLowerCase();
  const firstname = String(input.firstname).trim();
  const lastname = String(input.lastname).trim();

  const existingProfile = await getUserByEmail(normalizedEmail);
  if (existingProfile) throw new AppError("Email already exists", { statusCode: 409 });

  const existingAuth = await getAuthUserByEmail(normalizedEmail);
  if (existingAuth) throw new AppError("Email already exists", { statusCode: 409 });

  const displayName = `${firstname} ${lastname}`.trim();
  const authUser = await createAuthUser({ email: normalizedEmail, password: input.password, displayName });

  const email_lower = buildEmailLower(normalizedEmail);
  const full_name_lower = buildFullNameLower(firstname, lastname);
  const search_trigrams = buildTrigrams(`${full_name_lower} ${email_lower}`);

  try {
    const created = await createUser({
      email: normalizedEmail,
      firstname,
      lastname,
      role: "staff",
      auth_uid: authUser.uid,
      email_lower,
      full_name_lower,
      search_trigrams,
    });

    await assignStoreToUser({
      user_uuid: created.uuid,
      store_uuid: input.store_uuid,
      store_role: "staff",
      email: created.email,
      firstname,
      lastname,
    });

    return {
      uuid: created.uuid,
      email: created.email,
      role: "staff" as const,
      store_role: "staff" as const,
      store_uuid: input.store_uuid,
      firstname,
      lastname,
    };
  } catch (err) {
    try {
      await deleteAuthUser(authUser.uid);
    } catch {
      // best effort
    }
    throw err;
  }
}

export async function listStoreStaffService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
}) {
  await assertCanManageStoreStaff(input.actor, input.store_uuid);
  const staff = await listStaffMembershipsForStore(input.store_uuid);
  return {
    staff: staff.map((s) => ({
      uuid: s.user_uuid,
      email: s.email || "",
      firstname: s.firstname || "",
      lastname: s.lastname || "",
      role: "staff" as const,
      store_role: "staff" as const,
      created_at: s.created_at,
    })),
  };
}

export async function removeStoreStaffService(input: {
  actor: { uuid: string; role?: string };
  store_uuid: string;
  user_uuid: string;
}) {
  await assertCanManageStoreStaff(input.actor, input.store_uuid);

  if (String(input.user_uuid) === String(input.actor.uuid)) {
    throw new AppError("Cannot remove yourself", { statusCode: 400 });
  }

  const removed = await removeStaffFromStore({
    store_uuid: input.store_uuid,
    user_uuid: input.user_uuid,
  });
  if (!removed) throw new AppError("Staff member not found", { statusCode: 404 });

  return { removed: true, user_uuid: input.user_uuid, store_uuid: input.store_uuid };
}
