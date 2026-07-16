import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import {
  mostSoldItemsReportController,
  profitSummaryReportController,
  salesItemsReportController,
  salesSummaryReportController,
} from "../controllers/reports.controller";
import {
  mostSoldItemsQuerySchema,
  profitSummaryQuerySchema,
  salesItemsQuerySchema,
  salesSummaryQuerySchema,
} from "../validators/reports.validators";

export const reportsRouter = Router({ mergeParams: true });

reportsRouter.use(requireAuth);

reportsRouter.get("/sales-summary", validateQuery(salesSummaryQuerySchema), salesSummaryReportController);
reportsRouter.get("/profit-summary", validateQuery(profitSummaryQuerySchema), profitSummaryReportController);
reportsRouter.get("/most-sold-items", validateQuery(mostSoldItemsQuerySchema), mostSoldItemsReportController);
reportsRouter.get("/sales-items", validateQuery(salesItemsQuerySchema), salesItemsReportController);
