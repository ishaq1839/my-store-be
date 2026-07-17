import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  inventoryCreateItemBatchController,
  inventoryBulkCreateItemsController,
  inventoryBulkImportJobStatusController,
  inventoryListItemsController,
  inventoryListBatchesController,
  inventorySellController,
  inventoryUpdateItemPricesController,
} from "../controllers/inventory.controller";
import {
  inventoryCreateItemBodySchema,
  inventoryBulkCreateBodySchema,
  inventoryListItemsQuerySchema,
  inventorySellBodySchema,
  inventoryUpdatePricesBodySchema,
} from "../validators/inventory.validators";

export const inventoryRouter = Router({ mergeParams: true });

inventoryRouter.use(requireAuth);

inventoryRouter.post("/items/bulk", validateBody(inventoryBulkCreateBodySchema), inventoryBulkCreateItemsController);
inventoryRouter.get("/items/bulk/:job_id", inventoryBulkImportJobStatusController);
inventoryRouter.post("/items", validateBody(inventoryCreateItemBodySchema), inventoryCreateItemBatchController);
inventoryRouter.get("/items", validateQuery(inventoryListItemsQuerySchema), inventoryListItemsController);
inventoryRouter.patch(
  "/items/:item_id/prices",
  validateBody(inventoryUpdatePricesBodySchema),
  inventoryUpdateItemPricesController,
);
inventoryRouter.get("/items/:item_id/batches", inventoryListBatchesController);
inventoryRouter.post("/items/:item_id/sell", validateBody(inventorySellBodySchema), inventorySellController);
