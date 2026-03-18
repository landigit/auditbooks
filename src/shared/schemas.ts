import { z } from 'zod';

/**
 * POS Opening Shift Schema
 * Uses z.coerce to ensure strings from form inputs are correctly typed as numbers
 * before being processed or saved to the database.
 */
export const POSOpeningShiftSchema = z.object({
  openingCash: z.array(
    z.object({
      denomination: z.coerce.number().positive(),
      count: z.coerce.number().int().nonnegative(),
    })
  ),
  openingAmounts: z.array(
    z.object({
      paymentMethod: z.string(),
      amount: z.any(), // Money type handled by pesa library
    })
  ),
});

/**
 * POS Payment Schema
 */
export const POSPaymentSchema = z.object({
  paymentMethod: z.string().min(1, 'Payment method is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  referenceId: z.string().optional(),
  clearanceDate: z.coerce.date().optional(),
});

/**
 * Loyalty Points Redemption Schema
 */
export const LoyaltyPointsSchema = z.object({
  points: z.coerce
    .number()
    .int()
    .nonnegative('Points must be a non-negative integer'),
});

/**
 * Batch Selection Schema
 */
export const BatchSelectionSchema = z.object({
  batch: z.string().min(1, 'Batch selection is required'),
});

/**
 * POS Closing Shift Schemas
 */
export const ClosingCashRowSchema = z.object({
  denomination: z.number().positive(),
  count: z.number().int().nonnegative(),
});

export const ClosingAmountRowSchema = z.object({
  paymentMethod: z.string(),
  openingAmount: z.number(),
  closingAmount: z.number().nonnegative(),
  expectedAmount: z.number(),
  differenceAmount: z.number(),
});

export const POSClosingShiftSchema = z.object({
  closingCash: z.array(ClosingCashRowSchema),
  closingAmounts: z.array(ClosingAmountRowSchema),
});

/**
 * Price List Schema
 */
export const PriceListSchema = z.object({
  priceList: z.string().optional(),
});

/**
 * Item Enquiry Schema
 */
export const ItemEnquirySchema = z.object({
  item: z.string().min(1, 'Item is required'),
  description: z.string().optional(),
  customer: z.string().optional(),
  contact: z.string().optional(),
  similarProduct: z.string().optional(),
});
