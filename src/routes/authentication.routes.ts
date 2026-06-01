import { Router } from "express";
import {
  loginController,
  passwordResetRequestController,
  refreshTokenController,
  registerController,
} from "../controllers/authentication.controller";
import { validateBody } from "../middleware/validate";
import { passwordResetRequestBodySchema, refreshTokenBodySchema, registerBodySchema } from "../validators/authentication.validators";

export const authenticationRouter = Router();

authenticationRouter.post("/login", loginController);
authenticationRouter.post("/register", validateBody(registerBodySchema), registerController);
authenticationRouter.post("/password-reset/request", validateBody(passwordResetRequestBodySchema), passwordResetRequestController);
authenticationRouter.post("/refresh", validateBody(refreshTokenBodySchema), refreshTokenController);

