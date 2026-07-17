import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { previewBillService } from "../services/bills/previewBill.service";
import { finalizeBillService } from "../services/bills/finalizeBill.service";
import { listBillsService } from "../services/bills/listBills.service";
import { getBillDetailService } from "../services/bills/getBillDetail.service";
import { getSalesSummaryService } from "../services/bills/getSalesSummary.service";
import type { BillLineInput } from "../services/bills/fifoBillAllocate";

export async function billsPreviewController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const body = req.body as {
      lines: BillLineInput[];
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
      lines: BillLineInput[];
      discount_percent: number;
      username?: string;
      phone_number?: string;
      // Intentionally ignored if sent — seller always comes from bearer token.
      seller_id?: unknown;
      seller_name?: unknown;
      seller_email?: unknown;
      created_by?: unknown;
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
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month";
      date: string;
      refresh: boolean;
    };

    const result = await getSalesSummaryService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      refresh: q.refresh,
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
    const q = (req.validatedQuery ?? {}) as {
      from: string;
      to: string;
      limit: number;
      cursor: string;
      seller_name: string;
      customer_name: string;
      phone_number: string;
    };

    const result = await listBillsService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      from: q.from,
      to: q.to,
      limit: q.limit,
      cursor: q.cursor || undefined,
      seller_name: q.seller_name || undefined,
      customer_name: q.customer_name || undefined,
      phone_number: q.phone_number || undefined,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function billsGetDetailController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const bill_id = String(req.params.bill_id || "");

    const result = await getBillDetailService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      bill_id,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
