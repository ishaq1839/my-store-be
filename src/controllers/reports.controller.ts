import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError";
import { getSalesSummaryReportService } from "../services/reports/getSalesSummaryReport.service";
import { getProfitSummaryReportService } from "../services/reports/getProfitSummaryReport.service";
import { getMostSoldItemsReportService } from "../services/reports/getMostSoldItemsReport.service";
import { getSalesItemsReportService } from "../services/reports/getSalesItemsReport.service";
import { getStaffPerformanceReportService } from "../services/reports/getStaffPerformanceReport.service";

export async function salesSummaryReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      scope: "overall" | "items";
      refresh: boolean;
    };

    const result = await getSalesSummaryReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      scope: q.scope,
      refresh: q.refresh,
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
      refresh: boolean;
    };

    const result = await getProfitSummaryReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      scope: q.scope,
      refresh: q.refresh,
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
      refresh: boolean;
    };

    const result = await getMostSoldItemsReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      rank_by: q.rank_by,
      limit: q.limit,
      refresh: q.refresh,
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
      refresh: boolean;
    };

    const result = await getSalesItemsReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      limit: q.limit,
      cursor: q.cursor || undefined,
      refresh: q.refresh,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function staffPerformanceReportController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uuid) throw new AppError("Unauthorized", { statusCode: 401 });
    const store_uuid = String(req.params.store_uuid || "");
    const q = (req.validatedQuery ?? {}) as {
      period: "day" | "week" | "month" | "year";
      date: string;
      rank_by: "bill_count" | "revenue" | "both";
      limit: number;
      refresh: boolean;
    };

    const result = await getStaffPerformanceReportService({
      actor: { uuid: req.user.uuid, role: req.user.role },
      store_uuid,
      period: q.period,
      date: q.date,
      rank_by: q.rank_by,
      limit: q.limit,
      refresh: q.refresh,
    });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}
