import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";

type AnyError = Error & { statusCode?: number; expose?: boolean; code?: unknown };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const e = err as AnyError;

  let status = 500;
  let message = "Internal Server Error";

  if (e instanceof AppError) {
    status = e.statusCode;
    message = e.expose ? e.message : "Internal Server Error";
  } else if (typeof e?.statusCode === "number") {
    status = e.statusCode;
    const expose = typeof e.expose === "boolean" ? e.expose : status < 500;
    message = expose ? e.message || "Error" : "Internal Server Error";
  }

  if (status >= 500) {
    // Keep response safe; log the real error for debugging.
    console.error(e);
  }

  res.status(status).json({ message });
}

