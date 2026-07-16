import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createContactController, listContactsController } from "../controllers/contacts.controller";
import { contactCreateBodySchema } from "../validators/contacts.validators";

export const contactsRouter = Router({ mergeParams: true });

contactsRouter.use(requireAuth);

contactsRouter.post("/", validateBody(contactCreateBodySchema), createContactController);
contactsRouter.get("/", listContactsController);

