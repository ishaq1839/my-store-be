import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";
import { adminCreateUserBodySchema, adminListUsersQuerySchema } from "../validators/admin.validators";
import { adminCreateUserController, adminListUsersController } from "../controllers/admin/users.controller";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.post("/users", validateBody(adminCreateUserBodySchema), adminCreateUserController);
adminRouter.get("/users", validateQuery(adminListUsersQuerySchema), adminListUsersController);

