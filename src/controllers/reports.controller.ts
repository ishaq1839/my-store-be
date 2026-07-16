import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { getSalesSummaryReportService } from "../services/reports/getSalesSummaryReport.service";
import { getProfitSummaryReportService } from "../services/reports/getProfitSummaryReport.service";
import { getMostSoldItemsReportService } from "../services/reports/getMostSoldItemsReport.service";
import { getSalesItemsReportService } from "../services/reports/getSalesItemsReport.service";

export async function salesSummaryReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      scope: "overall" | "items";
    };

    const result = await getSalesSummaryReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      scope: q.scope,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function profitSummaryReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      scope: "overall" | "items";
    };

    const result = await getProfitSummaryReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      scope: q.scope,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function mostSoldItemsReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      rank_by: "quantity" | "revenue" | "both";
      limit: number;
    };

    const result = await getMostSoldItemsReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      rank_by: q.rank_by,
      limit: q.limit,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function salesItemsReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      limit: number;
      cursor: string;
    };

    const result = await getSalesItemsReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      limit: q.limit,
      cursor: q.cursor || undefined,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
