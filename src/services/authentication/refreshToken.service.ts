import jwt from "jsonwebtoken";
import { requireEnv } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { getStoresForUserUuid } from "../../database/repos/stores.repo";
import { getUserByUuid } from "../../database/repos/users.repo";

export type RefreshTokenInput = {
  refresh_token: string;
};

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  email: string;
  uuid: string;
  role: string;
  store: Awaited<ReturnType<typeof getStoresForUserUuid>>;
};

type RefreshTokenPayload = {
  sub?: string;
  token_type?: string;
};

export async function refreshToken(input: RefreshTokenInput): Promise<RefreshTokenResponse> {
  const refreshSecret = requireEnv("REFRESH_TOKEN_SECRET");
  const accessSecret = requireEnv("ACCESS_TOKEN_SECRET");

  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(String(input.refresh_token), refreshSecret) as RefreshTokenPayload;
  } catch {
    throw new AppError("Invalid refresh token", { statusCode: 401 });
  }

  if (payload.token_type !== "refresh" || !payload.sub) {
    throw new AppError("Invalid refresh token", { statusCode: 401 });
  }

  const user = await getUserByUuid(payload.sub);
  if (!user) throw new AppError("Invalid refresh token", { statusCode: 401 });

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

