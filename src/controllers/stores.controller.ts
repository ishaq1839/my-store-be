import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { createStoreService } from "../services/stores/createStore.service";
import { listStoresService } from "../services/stores/listStores.service";

export async function createStoreController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });

    const { name, address, description, status, subscription_status } = req.body as {
      name: string;
      address: string;
      description: string;
      status?: "active" | "inactive";
      subscription_status?: "free" | "subscribed";
    };

    const created = await createStoreService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      name,
      address,
      description,
      status,
      subscription_status,
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}

export async function listStoresController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });

    const { search, limit, cursor } = (req.validatedQuery ?? {}) as {
      search: string;
      limit: number;
      cursor: string;
    };

    const result = await listStoresService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      search: search || undefined,
      limit,
      cursor: cursor || undefined,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

