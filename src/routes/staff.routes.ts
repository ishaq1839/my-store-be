import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createStoreStaffController,
  listStoreStaffController,
  removeStoreStaffController,
} from "../controllers/staff.controller";
import { storeCreateStaffBodySchema } from "../validators/staff.validators";

export const staffRouter = Router({ mergeParams: true });

staffRouter.use(requireAuth);

staffRouter.post("/", validateBody(storeCreateStaffBodySchema), createStoreStaffController);
staffRouter.get("/", listStoreStaffController);
staffRouter.delete("/:user_uuid", removeStoreStaffController);
