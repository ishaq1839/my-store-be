import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import {
  mostSoldItemsReportController,
  profitSummaryReportController,
  salesItemsReportController,
  salesSummaryReportController,
  staffPerformanceReportController,
} from "../controllers/reports.controller";
import {
  mostSoldItemsQuerySchema,
  profitSummaryQuerySchema,
  salesItemsQuerySchema,
  salesSummaryQuerySchema,
  staffPerformanceQuerySchema,
} from "../validators/reports.validators";

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.use(requireAuth);

reportsRouter.get("/sales-summary", validateQuery(salesSummaryQuerySchema), salesSummaryReportController);
reportsRouter.get("/profit-summary", validateQuery(profitSummaryQuerySchema), profitSummaryReportController);
reportsRouter.get("/most-sold-items", validateQuery(mostSoldItemsQuerySchema), mostSoldItemsReportController);
reportsRouter.get("/sales-items", validateQuery(salesItemsQuerySchema), salesItemsReportController);
reportsRouter.get(
  "/staff-performance",
  validateQuery(staffPerformanceQuerySchema),
  staffPerformanceReportController,
);
