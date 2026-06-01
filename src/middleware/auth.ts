import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { requireEnv } from "../config/env";
import { AppError } from "../errors/AppError";

type AccessTokenPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

function getBearerToken(req: Request): string | null {
  const h = req.header("authorization") || req.header("Authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getBearerToken(req);
  if (!token) return next(new AppError("Unauthorized", { statusCode: 401 }));

  const secret = requireEnv("ACCESS_TOKEN_SECRET");
  try {
    const payload = jwt.verify(token, secret) as AccessTokenPayload;
    if (!payload.sub) return next(new AppError("Unauthorized", { statusCode: 401 }));
    req.user = { uuid: String(payload.sub), email: payload.email, role: payload.role };
    return next();
  } catch {
    return next(new AppError("Unauthorized", { statusCode: 401 }));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin") return next(new AppError("Forbidden", { statusCode: 403 }));
  return next();
}

