import { z } from "zod";

export const statusSchema = z.enum([
  "submitted",
  "under_review",
  "awaiting_customer",
  "awaiting_partner",
  "in_progress",
  "completed",
  "cancelled",
  "unable_to_fulfil"
]);

export const enquirySchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(40),
  location: z.string().trim().min(2).max(160),
  service: z.enum(["telecom", "sim", "networking", "broadband", "other"]),
  audience: z.enum(["individual", "business"]).default("individual"),
  details: z.string().trim().min(10).max(2000),
  consent: z.literal("yes"),
  website: z.string().optional()
});

export const updateSchema = z.object({
  id: z.uuid(),
  status: statusSchema,
  internalNotes: z.string().max(4000).optional(),
  assignedTo: z.uuid().nullable().optional()
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type AdminUpdateInput = z.infer<typeof updateSchema>;
export type EnquiryStatus = z.infer<typeof statusSchema>;
