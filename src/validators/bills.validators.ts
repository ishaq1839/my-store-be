import { z } from "zod";

const billLineSchema = z.object({
  item_id: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
});

const billLinesSchema = z.array(billLineSchema).min(1, "at least one line item is required");

export const billPreviewBodySchema = z.object({
  lines: billLinesSchema,
  final_total: z.coerce.number().finite().positive().optional(),
  discount_percent: z.coerce.number().finite().min(0).max(100).optional(),
});

export const billFinalizeBodySchema = z.object({
  lines: billLinesSchema,
  discount_percent: z.coerce.number().finite().min(0, "discount_percent must be >= 0").max(100, "discount_percent must be <= 100"),
});

export const billListQuerySchema = z.object({
  from: z.string().trim().min(1, "from is required (ISO date)"),
  to: z.string().trim().min(1, "to is required (ISO date)"),
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
});
