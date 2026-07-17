import { z } from "zod";
import { INVENTORY_ITEM_TYPES } from "../services/inventory/inventoryItemTypes";

const inventoryItemTypeSchema = z.enum(INVENTORY_ITEM_TYPES);

export const inventoryCreateItemBodySchema = z
  .object({
    item_id: z.string().trim().min(1).optional(),
    type: inventoryItemTypeSchema.optional(),
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    retail_price: z.coerce.number().positive("retail_price must be positive"),
    sale_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
    total_items: z.coerce.number().int().nonnegative("total_items must be zero or a positive integer").optional(),
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
      const qty = data.total_items ?? 0;
      if (data.type === "service") {
        if (qty !== 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "total_items must be 0 for service items",
            path: ["total_items"],
          });
        }
      } else if (qty <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "total_items must be a positive integer for single and carton items",
          path: ["total_items"],
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

export const inventoryUpdatePricesBodySchema = z.object({
  retail_price: z.coerce.number().positive("retail_price must be positive"),
  sale_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
  /** Optional: set new remaining stock. Omit to keep current remaining quantity when repricing. */
  total_items: z.coerce.number().int().nonnegative("total_items must be zero or a positive integer").optional(),
});

/** Single new-item row for bulk create (no item_id / add-batch). */
export const inventoryBulkItemSchema = z
  .object({
    type: inventoryItemTypeSchema,
    name: z.string().trim().min(1, "name is required").max(200, "name is too long"),
    description: z.string().trim().min(1, "description is required").max(2000, "description is too long"),
    retail_price: z.coerce.number().positive("retail_price must be positive"),
    sale_price: z.union([z.coerce.number().nonnegative(), z.null()]).optional(),
    total_items: z.coerce.number().int().nonnegative("total_items must be zero or a positive integer").optional(),
  })
  .superRefine((data, ctx) => {
    const qty = data.total_items ?? 0;
    if (data.type === "service") {
      if (qty !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "total_items must be 0 for service items",
          path: ["total_items"],
        });
      }
    } else if (qty <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "total_items must be a positive integer for single and carton items",
        path: ["total_items"],
      });
    }
  });

export const inventoryBulkCreateBodySchema = z.object({
  items: z
    .array(inventoryBulkItemSchema)
    .min(1, "items must contain at least 1 row")
    .max(100, "items cannot exceed 100 rows per request"),
});

export type InventoryBulkCreateBody = z.infer<typeof inventoryBulkCreateBodySchema>;
