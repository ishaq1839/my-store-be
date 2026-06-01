import { AppError } from "../../errors/AppError";


import { getAuth } from "../firestoreAdmin";

export type CreateAuthUserInput = {
  email: string;
  password: string;
  displayName?: string;
};

export async function createAuthUser(input: CreateAuthUserInput): Promise<{ uid: string }> {
  const auth = getAuth();

  try {
    const user = await auth.createUser({
      email: String(input.email).trim().toLowerCase(),
      password: String(input.password),
      displayName: input.displayName ? String(input.displayName) : undefined,
    });

    return { uid: user.uid };
  } catch (err) {
    const code = (err as { code?: unknown })?.code;
    if (code === "auth/email-already-exists") {
      throw new AppError("Email already exists", { statusCode: 409 });
    }
    



    throw err;
  }
}

export async function getAuthUserByEmail(email: string): Promise<{ uid: string; email: string } | null> {
  const auth = getAuth();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    const user = await auth.getUserByEmail(normalizedEmail);
    return { uid: user.uid, email: user.email || normalizedEmail };
  } catch (err) {
    const code = (err as { code?: unknown })?.code;
    if (code === "auth/user-not-found") return null;
    throw err;
  }
}

export async function deleteAuthUser(uid: string): Promise<void> {
  const auth = getAuth();
  await auth.deleteUser(uid);
}

export async function generatePasswordResetLink(email: string): Promise<string> {
  const auth = getAuth();
  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    return await auth.generatePasswordResetLink(normalizedEmail);
  } catch (err) {
    const code = (err as { code?: unknown })?.code;
    // Avoid user enumeration: treat missing user as success (no link).
    if (code === "auth/user-not-found") return "";
    throw err;
  }
}

