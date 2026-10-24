import { randomUUID } from "node:crypto";

export type NotificationChannel = "email" | "sms";

export type EnquiryNotificationPayload = {
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  location: string;
  details: string;
};

export type StatusUpdateNotificationPayload = {
  reference: string;
  fullName: string;
  email: string;
  phone?: string;
  oldStatus?: string;
  newStatus: string;
  note?: string | null;
};

export type NotificationRecord = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  simulated: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

// In-memory record stream for testing and local verification
const notificationLog: NotificationRecord[] = [];

export function getNotificationHistory(): readonly NotificationRecord[] {
  return [...notificationLog];
}

export function clearNotificationHistory(): void {
  notificationLog.length = 0;
}

/**
 * Checks whether live external notifications are enabled via environment variables.
 */
export function areNotificationsEnabled(): boolean {
  return process.env.ENABLE_NOTIFICATIONS === "true";
}

/**
 * Dispatches an automated confirmation email to the customer who submitted an enquiry.
 */
export async function sendCustomerEnquiryConfirmation(
  payload: EnquiryNotificationPayload
): Promise<NotificationRecord> {
  const isEnabled = areNotificationsEnabled();
  const subject = `Enquiry Received: ${payload.reference} - Divine Links`;
  const body = `Hello ${payload.fullName},

Thank you for contacting Divine Links. We have received your ${payload.service} enquiry for ${payload.location}.

Your unique reference number is: ${payload.reference}

Next Steps:
1. Our technical team is reviewing your specifications and evaluating local infrastructure availability.
2. A representative will contact you via email (${payload.email}) or phone (${payload.phone}) to discuss verified options and quotation details.
3. Submitting an enquiry does not incur any fee or commitment.

Kind regards,
The Divine Links Team
https://divinelinks.co`;

  const record: NotificationRecord = {
    id: `notif-${randomUUID()}`,
    channel: "email",
    recipient: payload.email,
    subject,
    body,
    simulated: !isEnabled,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      type: "customer_confirmation",
      service: payload.service
    }
  };

  notificationLog.push(record);

  if (!isEnabled) {
    console.info("[Notification Simulated - Customer Confirmation]", {
      recipient: payload.email,
      reference: payload.reference
    });
    return record;
  }

  // Hook for live provider (e.g. Resend, SendGrid, Postmark, AWS SES)
  return record;
}

/**
 * Dispatches an operational alert to Divine Links internal staff desk.
 */
export async function sendAdminEnquiryAlert(
  payload: EnquiryNotificationPayload,
  adminEmail = "ops@divinelinks.co"
): Promise<NotificationRecord> {
  const isEnabled = areNotificationsEnabled();
  const subject = `[New Enquiry] ${payload.reference} - ${payload.fullName} (${payload.service.toUpperCase()})`;
  const body = `New Enquiry Logged on Desk:

Reference: ${payload.reference}
Client: ${payload.fullName}
Email: ${payload.email}
Phone: ${payload.phone}
Location: ${payload.location}
Service: ${payload.service}

Details:
${payload.details}

Review in Admin Desk:
http://localhost:3000/admin`;

  const record: NotificationRecord = {
    id: `notif-${randomUUID()}`,
    channel: "email",
    recipient: adminEmail,
    subject,
    body,
    simulated: !isEnabled,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      type: "admin_alert"
    }
  };

  notificationLog.push(record);

  if (!isEnabled) {
    console.info("[Notification Simulated - Admin Alert]", {
      recipient: adminEmail,
      reference: payload.reference
    });
  }

  return record;
}

/**
 * Dispatches an automated update notice to a customer when enquiry status changes.
 */
export async function sendStatusUpdateNotification(
  payload: StatusUpdateNotificationPayload
): Promise<NotificationRecord> {
  const isEnabled = areNotificationsEnabled();
  const humanStatus = payload.newStatus.replaceAll("_", " ").toUpperCase();
  const subject = `Update on your Enquiry ${payload.reference}: ${humanStatus}`;
  const body = `Hello ${payload.fullName},

We are writing to update you on the status of your Divine Links enquiry (Ref: ${payload.reference}).

Current Status: ${humanStatus}
${payload.note ? `\nStaff Notes:\n"${payload.note}"\n` : ""}

If you have questions or wish to provide additional details, please reply to this notice or contact privacy@divinelinks.co.

Best regards,
The Divine Links Operations Desk`;

  const record: NotificationRecord = {
    id: `notif-${randomUUID()}`,
    channel: "email",
    recipient: payload.email,
    subject,
    body,
    simulated: !isEnabled,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      newStatus: payload.newStatus
    }
  };

  notificationLog.push(record);

  if (!isEnabled) {
    console.info("[Notification Simulated - Status Change]", {
      recipient: payload.email,
      reference: payload.reference,
      newStatus: payload.newStatus
    });
  }

  return record;
}
