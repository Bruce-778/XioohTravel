import { z } from "zod";
import { isValidFlightNumber, normalizeFlightNumber } from "@/lib/flightNumber";

const OptionalFlightNumberSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const normalized = normalizeFlightNumber(value);
    return normalized || undefined;
  },
  z
    .string()
    .optional()
    .refine((value) => !value || isValidFlightNumber(value), {
      message: "Invalid flight number",
    })
);

const ChildCountSchema = z.coerce.number().int().min(0).max(10);
const ChildSeatCountSchema = z.coerce.number().int().min(0).max(2);
const LuggageCountSchema = z.coerce.number().int().min(0).max(20);

function getChildrenCount(data: { children?: number }) {
  return data.children ?? 0;
}

function addPassengerChildAndLuggageIssues(
  data: { passengers: number; children?: number; luggageLarge?: number },
  ctx: z.RefinementCtx
) {
  const children = getChildrenCount(data);

  if (children > data.passengers) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Children cannot exceed passengers",
      path: ["children"],
    });
  }

  if ((data.luggageLarge ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Large luggage is no longer supported",
      path: ["luggageLarge"],
    });
  }
}

function normalizeChildrenAndLuggage<T extends { children?: number; luggageLarge?: number }>(
  data: T
) {
  const children = getChildrenCount(data);
  return {
    ...data,
    children,
    luggageLarge: 0,
  };
}

const SearchBaseSchema = z.object({
  tripType: z.enum(["PICKUP", "DROPOFF", "POINT_TO_POINT"]),
  fromArea: z.string().min(2),
  toArea: z.string().min(2),
  pickupTime: z.string().min(1),
  passengers: z.coerce.number().int().min(1).max(50),
  children: ChildCountSchema.optional(),
  luggageSmall: LuggageCountSchema.default(0),
  luggageMedium: LuggageCountSchema.default(0),
  luggageLarge: LuggageCountSchema.default(0)
});

export const SearchSchema = SearchBaseSchema
  .superRefine(addPassengerChildAndLuggageIssues)
  .transform(normalizeChildrenAndLuggage);

export const CheckoutSearchSchema = SearchBaseSchema.extend({
  vehicleTypeId: z.string().min(5),
})
  .superRefine(addPassengerChildAndLuggageIssues)
  .transform(normalizeChildrenAndLuggage);

const CreateBookingBaseSchema = z.object({
  tripType: z.enum(["PICKUP", "DROPOFF", "POINT_TO_POINT"]),
  fromArea: z.string().min(2),
  toArea: z.string().min(2),
  pickupTime: z.string().min(1),
  pickupLocation: z.string().min(2),
  dropoffLocation: z.string().min(2),
  passengers: z.coerce.number().int().min(1).max(50),
  children: ChildCountSchema.optional(),
  childSeats: ChildSeatCountSchema.default(0),
  meetAndGreetSign: z.coerce.boolean().default(false),
  luggageSmall: LuggageCountSchema.default(0),
  luggageMedium: LuggageCountSchema.default(0),
  luggageLarge: LuggageCountSchema.default(0),
  vehicleTypeId: z.string().min(5),
  flightNumber: OptionalFlightNumberSchema,
  flightNote: z.string().optional(),
  contactName: z.string().min(1),
  contactPhone: z.string().min(5),
  contactEmail: z.string().email(),
  contactNote: z.string().optional()
});

export const CreateBookingSchema = CreateBookingBaseSchema
  .superRefine((data, ctx) => {
    addPassengerChildAndLuggageIssues(data, ctx);

    if (data.tripType === "PICKUP" && (!data.flightNumber || data.flightNumber.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Flight number is required for pickup",
        path: ["flightNumber"],
      });
    }
  })
  .transform(normalizeChildrenAndLuggage);

export const RetryPaymentSchema = z.object({
  bookingId: z.string().min(5),
  contactEmail: z.string().email().optional()
});

export const CancelBookingSchema = z.object({
  bookingId: z.string().min(5),
  contactEmail: z.string().email(),
  reason: z.string().min(2).max(200)
});

export const RefundPreviewSchema = z.object({
  bookingId: z.string().min(5),
  contactEmail: z.string().email()
});

export const AdminUpdateBookingSchema = z.object({
  bookingId: z.string().min(5),
  status: z
    .enum(["PENDING_PAYMENT", "PAID", "CONFIRMED", "IN_SERVICE", "COMPLETED", "CANCELLED"])
    .optional(),
  manualAdjustmentJpy: z.coerce.number().int().min(-500000).max(500000).optional(),
  pricingNote: z.string().max(200).optional()
});

export const AdminPricingRuleSchema = z.object({
  fromArea: z.string().min(1),
  toArea: z.string().min(1),
  tripType: z.enum(["PICKUP", "DROPOFF", "POINT_TO_POINT"]),
  vehicleTypeId: z.string().min(1),
  basePriceJpy: z.coerce.number().int().min(0).max(1000000),
  nightFeeJpy: z.coerce.number().int().min(0).max(100000).optional(),
  urgentFeeJpy: z.coerce.number().int().min(0).max(100000).optional()
});

const DateTimeStringSchema = z.string().min(1).refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}, {
  message: "Invalid datetime",
});

const AdminPricingOverrideBaseSchema = z.object({
  fromArea: z.string().min(1),
  toArea: z.string().min(1),
  tripType: z.enum(["PICKUP", "DROPOFF", "POINT_TO_POINT"]),
  vehicleTypeId: z.string().min(1),
  startsAt: DateTimeStringSchema,
  endsAt: DateTimeStringSchema,
  basePriceJpy: z.coerce.number().int().min(0).max(1000000),
  nightFeeJpy: z.coerce.number().int().min(0).max(100000).optional(),
  urgentFeeJpy: z.coerce.number().int().min(0).max(100000).optional(),
  note: z.string().max(500).optional().nullable(),
  enabled: z.boolean().optional(),
});

export const AdminPricingOverrideSchema = AdminPricingOverrideBaseSchema.refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
  message: "End datetime must be after start datetime",
  path: ["endsAt"],
});

export const AdminPricingOverrideUpdateSchema = AdminPricingOverrideBaseSchema.extend({
  id: z.string().min(1),
}).refine((data) => new Date(data.endsAt).getTime() > new Date(data.startsAt).getTime(), {
  message: "End datetime must be after start datetime",
  path: ["endsAt"],
});

export const AdminPricingImportRowSchema = z.object({
  rowNumber: z.coerce.number().int().min(2),
  fromArea: z.string().min(1),
  toArea: z.string().min(1),
  tripType: z.enum(["PICKUP", "DROPOFF", "POINT_TO_POINT"]),
  vehicleTypeId: z.string().min(1),
  vehicleTypeName: z.string().min(1),
  basePriceJpy: z.coerce.number().int().min(0).max(1000000),
  nightFeeJpy: z.coerce.number().int().min(0).max(100000),
  urgentFeeJpy: z.coerce.number().int().min(0).max(100000),
  action: z.enum(["create", "update"]),
});

export const AdminPricingImportCommitSchema = z.object({
  rows: z.array(AdminPricingImportRowSchema).min(1),
});
