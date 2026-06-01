import bcrypt from "bcryptjs";
import { AppError } from "../../../errors/AppError";
import { createAuthUser, deleteAuthUser, getAuthUserByEmail } from "../../../database/repos/firebaseAuth.repo";
import { createUser, getUserByEmail } from "../../../database/repos/users.repo";
import { buildEmailLower, buildFullNameLower, buildTrigrams } from "./searchTokens";

export type AdminCreateUserInput = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
};

export type AdminCreateUserResponse = {
  uuid: string;
  email: string;
  role: "user";
  firstname: string;
  lastname: string;
};

export async function adminCreateUser(input: AdminCreateUserInput): Promise<AdminCreateUserResponse> {
  const normalizedEmail = String(input.email).trim().toLowerCase();

  const existingProfile = await getUserByEmail(normalizedEmail);
  if (existingProfile) throw new AppError("Email already exists", { statusCode: 409 });

  const existingAuth = await getAuthUserByEmail(normalizedEmail);
  if (existingAuth) throw new AppError("Email already exists", { statusCode: 409 });

  const displayName = `${String(input.firstname).trim()} ${String(input.lastname).trim()}`.trim();
  const authUser = await createAuthUser({ email: normalizedEmail, password: input.password, displayName });

  const password_hash = await bcrypt.hash(String(input.password), 10);
  const email_lower = buildEmailLower(normalizedEmail);
  const full_name_lower = buildFullNameLower(input.firstname, input.lastname);
  const search_trigrams = buildTrigrams(`${full_name_lower} ${email_lower}`);

  try {
    const created = await createUser({
      email: normalizedEmail,
      firstname: input.firstname,
      lastname: input.lastname,
      role: "user",
      password_hash,
      auth_uid: authUser.uid,
      email_lower,
      full_name_lower,
      search_trigrams,
    });

    return {
      uuid: created.uuid,
      email: created.email,
      role: "user",
      firstname: String(input.firstname).trim(),
      lastname: String(input.lastname).trim(),
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

