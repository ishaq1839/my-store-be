import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  billsPreviewController,
  billsFinalizeController,
  billsSummaryController,
  billsListController,
} from "../controllers/bills.controller";
import {
  billPreviewBodySchema,
  billFinalizeBodySchema,
  billSummaryQuerySchema,
  billListQuerySchema,
} from "../validators/bills.validators";

export const billsRouter = Router({ mergeParams: true });

billsRouter.use(requireAuth);

billsRouter.post("/preview", validateBody(billPreviewBodySchema), billsPreviewController);
billsRouter.get("/summary", validateQuery(billSummaryQuerySchema), billsSummaryController);
billsRouter.post("/", validateBody(billFinalizeBodySchema), billsFinalizeController);
billsRouter.get("/", validateQuery(billListQuerySchema), billsListController);
