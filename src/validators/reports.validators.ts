import { z } from "zod";

const reportPeriodSchema = z.enum(["day", "week", "month", "year"]);

const reportDateSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((s) => (s ? s : new Date().toISOString().slice(0, 10)));

export const salesSummaryQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  scope: z.enum(["overall", "items"]).optional().default("overall"),
});

export const profitSummaryQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  scope: z.enum(["overall", "items"]).optional().default("overall"),
});

export const mostSoldItemsQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  rank_by: z.enum(["quantity", "revenue", "both"]).optional().default("both"),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
});

/** Basic sold-items listing (no profit). Defaults to today when period/date omitted. */
export const salesItemsQuerySchema = z.object({
  period: reportPeriodSchema.optional().default("day"),
  date: reportDateSchema,
  limit: z
    .string()
    .optional()
    .default("20")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  cursor: z.string().trim().optional().default(""),
});
