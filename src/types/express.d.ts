import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        uuid: string;
        email?: string;
        role?: string;
      };
      validatedQuery?: unknown;
    }
  }
}

