import { createUser, getUserByEmail } from "../../database/repos/users.repo";
import { AppError } from "../../errors/AppError";
import { createAuthUser, deleteAuthUser, getAuthUserByEmail } from "../../database/repos/firebaseAuth.repo";
import { buildEmailLower, buildFullNameLower, buildTrigrams } from "../admin/users/searchTokens";

export type RegisterInput = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  role?: string;
};

export type RegisterResponse = {
  uuid: string;
  email: string;
  role: string;
  firstname: string;
  lastname: string;
};

function normalizeRole(role?: string): string {
  const r = String(role || "user").trim().toLowerCase();
  return r === "admin" ? "admin" : "user";
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  const role = normalizeRole(input.role);
  const normalizedEmail = String(input.email).trim().toLowerCase();

  // Duplication guard (Firestore)
  const existingProfile = await getUserByEmail(normalizedEmail);
  if (existingProfile) throw new AppError("Email already exists", { statusCode: 409 });

  // Duplication guard (Firebase Auth)
  const existingAuth = await getAuthUserByEmail(normalizedEmail);
  if (existingAuth) throw new AppError("Email already exists", { statusCode: 409 });

  const displayName = `${String(input.firstname).trim()} ${String(input.lastname).trim()}`.trim();
  const authUser = await createAuthUser({ email: normalizedEmail, password: input.password, displayName });

  const email_lower = buildEmailLower(normalizedEmail);
  const full_name_lower = buildFullNameLower(input.firstname, input.lastname);
  const search_trigrams = buildTrigrams(`${full_name_lower} ${email_lower}`);

  let created: { uuid: string; email: string; role?: string };
  try {
    created = await createUser({
      email: normalizedEmail,
      firstname: input.firstname,
      lastname: input.lastname,
      role,
      auth_uid: authUser.uid,
      email_lower,
      full_name_lower,
      search_trigrams,
    });
  } catch (err) {
    // If Firestore write fails after Auth user creation, rollback auth user.
    try {
      await deleteAuthUser(authUser.uid);
    } catch {
      // Best effort rollback; don't hide original failure.
    }
    throw err;
  }

  return {
    uuid: created.uuid,
    email: created.email,
    role: created.role ?? "user",
    firstname: String(input.firstname).trim(),
    lastname: String(input.lastname).trim(),
  };
}
