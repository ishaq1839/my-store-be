import { z } from "zod";

const reportPeriodSchema = z.enum(["day", "week", "month", "year"]);

const reportDateSchema = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((s) => (s ? s : new Date().toISOString().slice(0, 10)));

/** Force reload from Firestore and replace the 30m in-memory report cache. */
export const reportRefreshQuerySchema = z
  .string()
  .optional()
  .default("false")
  .transform((v) => ["1", "true", "yes"].includes(String(v).trim().toLowerCase()));

export const salesSummaryQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  scope: z.enum(["overall", "items"]).optional().default("overall"),
  refresh: reportRefreshQuerySchema,
});

export const profitSummaryQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  scope: z.enum(["overall", "items"]).optional().default("overall"),
  refresh: reportRefreshQuerySchema,
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
  refresh: reportRefreshQuerySchema,
});

export const staffPerformanceQuerySchema = z.object({
  period: reportPeriodSchema,
  date: reportDateSchema,
  rank_by: z.enum(["bill_count", "revenue", "both"]).optional().default("bill_count"),
  limit: z
    .string()
    .optional()
    .default("10")
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n >= 1 && n <= 50, "limit must be between 1 and 50"),
  refresh: reportRefreshQuerySchema,
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
  refresh: reportRefreshQuerySchema,
});
