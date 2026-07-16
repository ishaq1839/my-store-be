import { z } from "zod";

export const storeCreateBodySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200, "name is too long"),
  address: z.string().trim().min(1, "address is required").max(500, "address is too long"),
  description: z.string().trim().min(1, "description is required").max(2000, "description is too long"),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  subscription_status: z.enum(["free", "subscribed"]).optional().default("free"),
  owner_id: z.string().trim().min(1).optional(),
});

export type StoreCreateBody = z.infer<typeof storeCreateBodySchema>;

export const storeListQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  cursor: z.string().trim().optional().default(""),
});

export type StoreListQuery = z.infer<typeof storeListQuerySchema>;

