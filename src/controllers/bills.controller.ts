import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { previewBillService } from "../services/bills/previewBill.service";
import { finalizeBillService } from "../services/bills/finalizeBill.service";
import { listBillsService } from "../services/bills/listBills.service";
import { getSalesSummaryService } from "../services/bills/getSalesSummary.service";

export async function billsPreviewController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const body = req.body as {
      lines: { item_id: string; quantity: number; unit_discount?: number }[];
      final_total?: number;
      discount_percent?: number;
    };

    const result = await previewBillService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      lines: body.lines,
      final_total: body.final_total,
      discount_percent: body.discount_percent,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function billsFinalizeController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const body = req.body as {
      lines: { item_id: string; quantity: number; unit_discount?: number }[];
      discount_percent: number;
      username?: string;
      phone_number?: string;
    };

    const bill = await finalizeBillService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      lines: body.lines,
      discount_percent: body.discount_percent,
      username: body.username,
      phone_number: body.phone_number,
    });

    return res.status(201).json(bill);
  } catch (err) {
    return next(err);
  }
}

export async function billsSummaryController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as { period: "day" | "week" | "month"; date: string };

    const result = await getSalesSummaryService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function billsListController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as { from: string; to: string; limit: number; cursor: string };

    const result = await listBillsService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      from: q.from,
      to: q.to,
      limit: q.limit,
      cursor: q.cursor || undefined,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
