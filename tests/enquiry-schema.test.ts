import { describe, it, expect } from "vitest";
import { enquirySchema } from "@/app/api/enquiries/route";

describe("Enquiry Validation Schema", () => {
  const validPayload = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+234 801 234 5678",
    location: "Victoria Island, Lagos",
    service: "telecom",
    audience: "individual",
    details: "Looking for reliable high-speed data connectivity for home office.",
    consent: "yes"
  };

  it("validates a complete, correct enquiry payload", () => {
    const result = enquirySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe("Ada Lovelace");
      expect(result.data.email).toBe("ada@example.com");
      expect(result.data.service).toBe("telecom");
      expect(result.data.consent).toBe("yes");
    }
  });

  it("accepts all valid service types", () => {
    const services = ["telecom", "sim", "networking", "broadband", "other"] as const;
    for (const service of services) {
      const result = enquirySchema.safeParse({ ...validPayload, service });
      expect(result.success).toBe(true);
    }
  });

  it("defaults audience to individual if omitted", () => {
    const withoutAudience = { ...validPayload };
    delete (withoutAudience as Record<string, unknown>).audience;
    const result = enquirySchema.safeParse(withoutAudience);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audience).toBe("individual");
    }
  });

  it("accepts business audience", () => {
    const result = enquirySchema.safeParse({ ...validPayload, audience: "business" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audience).toBe("business");
    }
  });

  it("rejects invalid email formats", () => {
    const invalidEmails = ["notanemail", "user@", "@domain.com", "user@domain..com"];
    for (const email of invalidEmails) {
      const result = enquirySchema.safeParse({ ...validPayload, email });
      expect(result.success).toBe(false);
    }
  });

  it("rejects names that are too short", () => {
    const result = enquirySchema.safeParse({ ...validPayload, fullName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects phones that are too short or too long", () => {
    const tooShort = enquirySchema.safeParse({ ...validPayload, phone: "12345" });
    expect(tooShort.success).toBe(false);

    const tooLong = enquirySchema.safeParse({ ...validPayload, phone: "1".repeat(50) });
    expect(tooLong.success).toBe(false);
  });

  it("rejects details shorter than 10 characters", () => {
    const result = enquirySchema.safeParse({ ...validPayload, details: "Too short" });
    expect(result.success).toBe(false);
  });

  it("rejects submission if consent is missing or not 'yes'", () => {
    const missingConsent = enquirySchema.safeParse({ ...validPayload, consent: undefined });
    expect(missingConsent.success).toBe(false);

    const falseConsent = enquirySchema.safeParse({ ...validPayload, consent: "no" });
    expect(falseConsent.success).toBe(false);
  });

  it("accepts optional honeypot website field", () => {
    const botSubmission = enquirySchema.safeParse({ ...validPayload, website: "https://spam.com" });
    expect(botSubmission.success).toBe(true);
    if (botSubmission.success) {
      expect(botSubmission.data.website).toBe("https://spam.com");
    }
  });
});
