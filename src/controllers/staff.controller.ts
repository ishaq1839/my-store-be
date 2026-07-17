import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import {
  createStoreStaffService,
  listStoreStaffService,
  removeStoreStaffService,
} from "../services/staff/createStoreStaff.service";

export async function createStoreStaffController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const body = req.body as {
      email: string;
      password: string;
      firstname: string;
      lastname: string;
    };

    const result = await createStoreStaffService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      email: body.email,
      password: body.password,
      firstname: body.firstname,
      lastname: body.lastname,
    });

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function listStoreStaffController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");

    const result = await listStoreStaffService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function removeStoreStaffController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const user_uuid = String(req.params.user_uuid || "");

    const result = await removeStoreStaffService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      user_uuid,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
