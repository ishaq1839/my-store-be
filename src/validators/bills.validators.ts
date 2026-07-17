import { z } from "zod";

const billLineSchema = z
  .object({
    kind: z.enum(["item", "custom"]).optional().default("item"),
    item_id: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1, "name is required for custom lines").max(200, "name is too long").optional(),
    quantity: z.coerce.number().int().positive(),
    unit_price: z.coerce.number().positive("unit_price must be positive").optional(),
    unit_discount: z.coerce.number().finite().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "custom") {
      if (!data.name || !String(data.name).trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "name is required for custom lines", path: ["name"] });
      }
      if (data.unit_price == null || !(Number(data.unit_price) > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "unit_price is required for custom lines",
          path: ["unit_price"],
        });
      }
      if (data.unit_discount != null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "custom lines cannot use unit_discount",
          path: ["unit_discount"],
        });
      }
    } else if (!data.item_id || !String(data.item_id).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "item_id is required for inventory lines",
        path: ["item_id"],
      });
    }
  });

const billLinesSchema = z.array(billLineSchema).min(1, "at least one line item is required");

export const billPreviewBodySchema = z.object({
  lines: billLinesSchema,
  final_total: z.coerce.number().finite().positive().optional(),
  discount_percent: z.coerce.number().finite().min(0).max(100).optional(),
});

export const billFinalizeBodySchema = z.object({
  lines: billLinesSchema,
  discount_percent: z.coerce
    .number()
    .finite()
    .min(0, "discount_percent must be >= 0")
    .max(100, "discount_percent must be <= 100")
    .optional()
    .default(0),
  username: z.string().trim().min(1, "username is too short").max(120, "username is too long").optional(),
  phone_number: z
    .string()
    .trim()
    .min(7, "phone_number is too short")
    .max(30, "phone_number is too long")
    .regex(/^[0-9+()\-\s]+$/, "phone_number contains invalid characters")
    .optional(),
});

export const billListQuerySchema = z.object({
  from: z.string().trim().min(1, "from is required (ISO date)"),
  to: z.string().trim().min(1, "to is required (ISO date)"),
  seller_name: z.string().trim().max(120).optional().default(""),
  customer_name: z.string().trim().max(120).optional().default(""),
  phone_number: z.string().trim().max(30).optional().default(""),
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  cursor: z.string().trim().optional().default(""),
});

export const billSummaryQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]),
  date: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((s) => (s ? s : new Date().toISOString().slice(0, 10))),
  refresh: z
    .string()
    .optional()
    .default("false")
    .transform((v) => ["1", "true", "yes"].includes(String(v).trim().toLowerCase())),
});
