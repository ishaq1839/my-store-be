import { z } from "zod";

export const adminCreateUserBodySchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email"),
  password: z
    .string()
    .min(8, "password must be at least 8 characters")
    .max(128, "password is too long")
    .regex(/[a-z]/, "password must contain at least 1 lowercase letter")
    .regex(/[A-Z]/, "password must contain at least 1 uppercase letter")
    .regex(/[0-9]/, "password must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "password must contain at least 1 special character"),
  firstname: z.string().trim().min(1, "firstname is required").max(60, "firstname is too long"),
  lastname: z.string().trim().min(1, "lastname is required").max(60, "lastname is too long"),
});

export type AdminCreateUserBody = z.infer<typeof adminCreateUserBodySchema>;

export const adminListUsersQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  cursor: z.string().trim().optional().default(""),
});

export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

