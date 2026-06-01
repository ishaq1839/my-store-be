import { z } from "zod";

export const contactCreateBodySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120, "name is too long"),
  description: z.string().trim().min(1, "description is required").max(2000, "description is too long"),
  address: z.string().trim().max(500, "address is too long").optional(),
  contact_number: z
    .string()
    .trim()
    .min(7, "contact_number is too short")
    .max(30, "contact_number is too long")
    .regex(/^[0-9+()\\-\\s]+$/, "contact_number contains invalid characters")
    .optional(),
});

export type ContactCreateBody = z.infer<typeof contactCreateBodySchema>;

