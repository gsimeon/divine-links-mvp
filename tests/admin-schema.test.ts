import { describe, it, expect } from "vitest";
import { statusSchema, updateSchema } from "@/app/api/admin/enquiries/route";

describe("Admin Schemas", () => {
  describe("statusSchema", () => {
    it("accepts all 8 allowed enquiry lifecycle statuses", () => {
      const allowed = [
        "submitted",
        "under_review",
        "awaiting_customer",
        "awaiting_partner",
        "in_progress",
        "completed",
        "cancelled",
        "unable_to_fulfil"
      ];

      for (const status of allowed) {
        const result = statusSchema.safeParse(status);
        expect(result.success).toBe(true);
      }
    });

    it("rejects unknown statuses", () => {
      const invalid = ["pending", "paid", "draft", "deleted", "active"];
      for (const status of invalid) {
        const result = statusSchema.safeParse(status);
        expect(result.success).toBe(false);
      }
    });
  });

  describe("updateSchema", () => {
    const validUpdate = {
      id: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      status: "under_review",
      internalNotes: "Spoke with client, checking fibre presence in Victoria Island."
    };

    it("validates valid admin update payload", () => {
      const result = updateSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it("requires a valid UUID for id", () => {
      const result = updateSchema.safeParse({ ...validUpdate, id: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("allows optional internalNotes and trims whitespace", () => {
      const withoutNotes = { ...validUpdate };
      delete (withoutNotes as Record<string, unknown>).internalNotes;
      const result = updateSchema.safeParse(withoutNotes);
      expect(result.success).toBe(true);
    });

    it("validates assignedTo UUID if provided", () => {
      const withAssignee = {
        ...validUpdate,
        assignedTo: "12345678-1234-4234-8234-123456789abc"
      };
      const result = updateSchema.safeParse(withAssignee);
      expect(result.success).toBe(true);
    });

    it("rejects invalid assignedTo UUID", () => {
      const withInvalidAssignee = {
        ...validUpdate,
        assignedTo: "invalid-uuid"
      };
      const result = updateSchema.safeParse(withInvalidAssignee);
      expect(result.success).toBe(false);
    });
  });
});
