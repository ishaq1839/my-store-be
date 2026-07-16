import { AppError } from "../../errors/AppError";
import { requireEnv } from "../../config/env";
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

/**
 * Verify email/password against Firebase Auth (Identity Toolkit).
 * Admin SDK cannot verify passwords; this uses the Firebase Web API key.
 */
export async function signInWithEmailPassword(input: {
  email: string;
  password: string;
}): Promise<{ uid: string; email: string }> {
  const apiKey = requireEnv("FIREBASE_WEB_API_KEY");
  const email = String(input.email).trim().toLowerCase();
  const password = String(input.password);

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = (await res.json()) as {
    localId?: string;
    email?: string;
    error?: { message?: string; code?: number };
  };

  if (!res.ok || !data.localId) {
    const msg = String(data.error?.message || "");
    if (
      msg.includes("INVALID_PASSWORD") ||
      msg.includes("EMAIL_NOT_FOUND") ||
      msg.includes("INVALID_LOGIN_CREDENTIALS") ||
      msg.includes("USER_DISABLED")
    ) {
      throw new AppError("Invalid credentials", { statusCode: 401 });
    }
    throw new AppError(msg || "Authentication failed", { statusCode: 401 });
  }

  return { uid: String(data.localId), email: String(data.email || email) };
}

