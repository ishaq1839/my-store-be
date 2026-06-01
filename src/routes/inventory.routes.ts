import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  inventoryCreateItemBatchController,
  inventoryListItemsController,
  inventoryListBatchesController,
  inventorySellController,
} from "../controllers/inventory.controller";
import {
  inventoryCreateItemBodySchema,
  inventoryListItemsQuerySchema,
  inventorySellBodySchema,
} from "../validators/inventory.validators";

export const inventoryRouter = Router({ mergeParams: true });

inventoryRouter.use(requireAuth);

inventoryRouter.post("/items", validateBody(inventoryCreateItemBodySchema), inventoryCreateItemBatchController);
inventoryRouter.get("/items", validateQuery(inventoryListItemsQuerySchema), inventoryListItemsController);
inventoryRouter.get("/items/:item_id/batches", inventoryListBatchesController);
inventoryRouter.post("/items/:item_id/sell", validateBody(inventorySellBodySchema), inventorySellController);
