import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { createItemBatchService } from "../services/inventory/createItemBatch.service";
import { listInventoryItemsService } from "../services/inventory/listItems.service";
import { listBatchesService } from "../services/inventory/listBatches.service";
import { sellFromBatchesService } from "../services/inventory/sellFromBatches.service";

function itemPayload(it: {
  uuid: string;
  type?: "single" | "carton";
  name: string;
  description: string;
  short_code: string;
  total_items: number;
  current_retail_price: number;
  current_sale_price: number | null;
}) {
  return {
    uuid: it.uuid,
    type: it.type ?? "single",
    name: it.name,
    description: it.description,
    short_code: it.short_code,
    total_items: it.total_items,
    current_retail_price: it.current_retail_price,
    current_sale_price: it.current_sale_price,
  };
}

export async function inventoryCreateItemBatchController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const body = req.body as {
      item_id?: string;
      type?: "single" | "carton";
      name?: string;
      description?: string;
      retail_price: number;
      sale_price?: number;
      total_items: number;
    };

    const result = await createItemBatchService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      item_id: body.item_id,
      type: body.type,
      name: body.name,
      description: body.description,
      retail_price: body.retail_price,
      sale_price: body.sale_price,
      total_items: body.total_items,
    });

    if (!result.item) throw new AppError("Failed to load item", { statusCode: 500 });

    return res.status(201).json({
      item_id: result.item_id,
      batch_id: result.batch_id,
      created_new_item: result.created_new_item,
      item: itemPayload(result.item),
    });
  } catch (err) {
    return next(err);
  }
}

export async function inventoryListItemsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const { search, limit, cursor } = (req.validatedQuery ?? {}) as {
      search: string;
      limit: number;
      cursor: string;
    };

    const result = await listInventoryItemsService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      search: search || undefined,
      limit,
      cursor: cursor || undefined,
    });

    return res.status(200).json({
      items: result.items.map(itemPayload),
      next_cursor: result.next_cursor,
    });
  } catch (err) {
    return next(err);
  }
}

export async function inventoryListBatchesController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const item_id = String(req.params.item_id || "");

    const result = await listBatchesService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      item_id,
    });

    return res.status(200).json({
      item_id: result.item_id,
      batches: result.batches.map((b) => ({
        batch_id: b.batch_id,
        created_at: b.created_at,
        retail_price: b.retail_price,
        sale_price: b.sale_price,
        quantity_total: b.quantity_total,
        quantity_remaining: b.quantity_remaining,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function inventorySellController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const item_id = String(req.params.item_id || "");
    const { quantity } = req.body as { quantity: number };

    const result = await sellFromBatchesService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      item_id,
      quantity,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
