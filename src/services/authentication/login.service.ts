export type LoginInput = {
  email: string;
  password: string;
};

export type StoreDto = {
  uuid: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  address: string;
  status: string;
  subscription_status: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  email: string;
  uuid: string;
  role: string;
  store: StoreDto[];
};

import jwt from "jsonwebtoken";
import { requireEnv } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { getUserByEmail } from "../../database/repos/users.repo";
import { getStoresForUserUuid } from "../../database/repos/stores.repo";
import { signInWithEmailPassword } from "../../database/repos/firebaseAuth.repo";

function unauthorized(): AppError {
  return new AppError("Invalid credentials", { statusCode: 401 });
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const email = String(input.email).trim().toLowerCase();
  const password = String(input.password);

  // Password verified by Firebase Auth (not Firestore hash).
  await signInWithEmailPassword({ email, password });

  const user = await getUserByEmail(email);
  if (!user) throw unauthorized();

  const accessSecret = requireEnv("ACCESS_TOKEN_SECRET");
  const refreshSecret = requireEnv("REFRESH_TOKEN_SECRET");

  const access_token = jwt.sign({ sub: user.uuid, email: user.email, role: user.role }, accessSecret, {
    expiresIn: "15m",
  });

  const refresh_token = jwt.sign({ sub: user.uuid, token_type: "refresh" }, refreshSecret, { expiresIn: "30d" });

  const store = await getStoresForUserUuid(user.uuid);

  return {
    access_token,
    refresh_token,
    email: user.email,
    uuid: user.uuid,
    role: String(user.role || "user"),
    store,
  };
}
