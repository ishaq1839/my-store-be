import type { NextFunction, Request, Response } from "express";
import { adminCreateUser } from "../../services/admin/users/createUser.service";
import { adminListUsers } from "../../services/admin/users/listUsers.service";

export async function adminCreateUserController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, firstname, lastname } = req.body as {
      email: string;
      password: string;
      firstname: string;
      lastname: string;
    };

    const result = await adminCreateUser({ email, password, firstname, lastname });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function adminListUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, limit, cursor } = (req.validatedQuery ?? {}) as { search?: string; limit: number; cursor?: string };
    const result = await adminListUsers({ search, limit, cursor });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

