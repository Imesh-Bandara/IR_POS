import { z } from "zod";

export const StockAdjustmentSchema = z.object({
  quantity_change: z.number().refine(val => val !== 0, {
    message: "Quantity change cannot be zero"
  }),
  movement_type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "LOSS", "OPENING_STOCK"]),
  reason: z.string().min(3, "A valid reason is required for audit purposes")
});

export type StockAdjustmentFormValues = z.infer<typeof StockAdjustmentSchema>;
