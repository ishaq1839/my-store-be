import { Router } from "express";
import { authenticationRouter } from "./authentication.routes";
import { adminRouter } from "./admin.routes";
import { storesRouter } from "./stores.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authenticationRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/stores", storesRouter);

