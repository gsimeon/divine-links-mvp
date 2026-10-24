import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  sendCustomerEnquiryConfirmation,
  sendAdminEnquiryAlert,
  sendStatusUpdateNotification,
  getNotificationHistory,
  clearNotificationHistory,
  areNotificationsEnabled
} from "@/lib/notifications";

describe("Notification Dispatch Service", () => {
  const originalEnv = process.env.ENABLE_NOTIFICATIONS;

  beforeEach(() => {
    clearNotificationHistory();
    delete process.env.ENABLE_NOTIFICATIONS;
  });

  afterEach(() => {
    process.env.ENABLE_NOTIFICATIONS = originalEnv;
  });

  it("identifies notification status according to environment variable", () => {
    expect(areNotificationsEnabled()).toBe(false);
    process.env.ENABLE_NOTIFICATIONS = "true";
    expect(areNotificationsEnabled()).toBe(true);
  });

  it("generates and logs customer enquiry confirmation email", async () => {
    const payload = {
      reference: "DL-12345678",
      fullName: "Ngozi Eze",
      email: "ngozi@example.com",
      phone: "+234 802 345 6789",
      service: "broadband",
      location: "Ikeja GRA, Lagos",
      details: "Requesting high capacity fibre broadband for a software firm."
    };

    const record = await sendCustomerEnquiryConfirmation(payload);

    expect(record.recipient).toBe("ngozi@example.com");
    expect(record.subject).toContain("DL-12345678");
    expect(record.body).toContain("Ngozi Eze");
    expect(record.body).toContain("DL-12345678");
    expect(record.simulated).toBe(true);

    const history = getNotificationHistory();
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(record.id);
  });

  it("generates and logs admin desk alert", async () => {
    const payload = {
      reference: "DL-87654321",
      fullName: "Emeka Okoro",
      email: "emeka@business.ng",
      phone: "+234 809 111 2222",
      service: "networking",
      location: "Abuja Central",
      details: "Structured cabling consultation for 50-desk office."
    };

    const record = await sendAdminEnquiryAlert(payload);

    expect(record.recipient).toBe("ops@divinelinks.co");
    expect(record.subject).toContain("DL-87654321");
    expect(record.subject).toContain("Emeka Okoro");
    expect(record.body).toContain("Abuja Central");

    const history = getNotificationHistory();
    expect(history.length).toBe(1);
  });

  it("generates status change update notification with optional staff notes", async () => {
    const payload = {
      reference: "DL-99887766",
      fullName: "Fatima Aliyu",
      email: "fatima@example.com",
      newStatus: "under_review",
      note: "Survey engineer assigned to verify fibre junction on street."
    };

    const record = await sendStatusUpdateNotification(payload);

    expect(record.recipient).toBe("fatima@example.com");
    expect(record.subject).toContain("UNDER REVIEW");
    expect(record.body).toContain("Survey engineer assigned");

    const history = getNotificationHistory();
    expect(history.length).toBe(1);
  });

  it("clears notification history properly", async () => {
    await sendCustomerEnquiryConfirmation({
      reference: "DL-001",
      fullName: "Test",
      email: "test@example.com",
      phone: "1234567",
      service: "sim",
      location: "Lagos",
      details: "Test details"
    });

    expect(getNotificationHistory().length).toBe(1);
    clearNotificationHistory();
    expect(getNotificationHistory().length).toBe(0);
  });
});
