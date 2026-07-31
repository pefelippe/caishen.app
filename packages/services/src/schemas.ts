import { z } from "zod";

/** Shared request/response schemas — validated on both client and API. */

export const currencySchema = z.enum(["BRL", "USD", "EUR"]);

export const expenseCategorySchema = z.enum([
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Vestuário",
  "Outros",
]);

export const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: currencySchema.default("BRL"),
  category: expenseCategorySchema,
  description: z.string().max(280).optional(),
  date: z.iso.datetime(),
});

export const planSchema = z.enum(["free", "pro", "enterprise"]);

export const updateSubscriptionSchema = z.object({
  plan: planSchema,
});

export const aiInsightsRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type AiInsightsRequest = z.infer<typeof aiInsightsRequestSchema>;
