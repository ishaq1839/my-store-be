import { z } from "zod";

export const inventoryCreateItemBodySchema = z
  .object({
    item_id: z.string().trim().min(1).optional(),
    type: z.enum(["single", "carton"]).optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    retail_price: z.coerce.number().positive("retail_price must be positive"),
    sale_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
    total_items: z.coerce.number().int().positive("total_items must be a positive integer"),
  })
  .superRefine((data, ctx) => {
    if (!data.item_id) {
      if (!data.type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "type is required when creating a new item",
          path: ["type"],
        });
      }
      if (!data.name || !data.name.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "name is required when creating a new item", path: ["name"] });
      }
      if (data.description === undefined || data.description === null || String(data.description).trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "description is required when creating a new item",
          path: ["description"],
        });
      }
    }
  });

export const inventoryListItemsQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  cursor: z.string().trim().optional().default(""),
});

export const inventorySellBodySchema = z.object({
  quantity: z.coerce.number().int().positive("quantity must be a positive integer"),
});
