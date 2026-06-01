import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { createContactService } from "../services/contacts/createContact.service";
import { listContactsService } from "../services/contacts/listContacts.service";

export async function createContactController(req: Request, res: Response, next: NextFunction) {
  try {
    const owner_uuid = req.user?.uuid;
    if (!owner_uuid) throw new AppError("Unauthorized", { statusCode: 401 });

    const { name, description, address, contact_number } = req.body as {
      name: string;
      description: string;
      address?: string;
      contact_number?: string;
    };
    const created = await createContactService({ owner_uuid, name, description, address, contact_number });
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}

export async function listContactsController(req: Request, res: Response, next: NextFunction) {
  try {
    const owner_uuid = req.user?.uuid;
    if (!owner_uuid) throw new AppError("Unauthorized", { statusCode: 401 });

    const contacts = await listContactsService(owner_uuid);
    return res.status(200).json({ contacts });
  } catch (err) {
    return next(err);
  }
}

