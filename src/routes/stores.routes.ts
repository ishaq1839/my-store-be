import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { createStoreController, listStoresController } from "../controllers/stores.controller";
import { storeCreateBodySchema, storeListQuerySchema } from "../validators/stores.validators";
import { inventoryRouter } from "./inventory.routes";
import { billsRouter } from "./bills.routes";

export const storesRouter = Router();

storesRouter.use(requireAuth);

storesRouter.post("/", validateBody(storeCreateBodySchema), createStoreController);
storesRouter.get("/", validateQuery(storeListQuerySchema), listStoresController);
storesRouter.use("/:store_uuid/inventory", inventoryRouter);
storesRouter.use("/:store_uuid/bills", billsRouter);

