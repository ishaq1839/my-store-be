import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "password must be at least 8 characters")
  .max(128, "password is too long")
  .regex(/[a-z]/, "password must contain at least 1 lowercase letter")
  .regex(/[A-Z]/, "password must contain at least 1 uppercase letter")
  .regex(/[0-9]/, "password must contain at least 1 number")
  .regex(/[^A-Za-z0-9]/, "password must contain at least 1 special character");

export const storeCreateStaffBodySchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email"),
  password: passwordSchema,
  firstname: z.string().trim().min(1, "firstname is required").max(60, "firstname is too long"),
  lastname: z.string().trim().min(1, "lastname is required").max(60, "lastname is too long"),
});

export type StoreCreateStaffBody = z.infer<typeof storeCreateStaffBodySchema>;
