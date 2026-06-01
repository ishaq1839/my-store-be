import { Router } from "express";
import { authenticationRouter } from "./authentication.routes";
import { adminRouter } from "./admin.routes";
import { contactsRouter } from "./contacts.routes";
import { storesRouter } from "./stores.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authenticationRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/contacts", contactsRouter);
apiRouter.use("/stores", storesRouter);

