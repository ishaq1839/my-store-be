import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed as unknown;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues[0]?.message || "Invalid request body";
        return next(new AppError(message, { statusCode: 400 }));
      }
      return next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      req.validatedQuery = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues[0]?.message || "Invalid query";
        return next(new AppError(message, { statusCode: 400 }));
      }
      return next(err);
    }
  };
}

