import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type NotificationChannel = "email" | "sms";

export type EnquiryNotificationPayload = {
  enquiryId?: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  service: string;
  location: string;
  details: string;
};

export type StatusUpdateNotificationPayload = {
  enquiryId?: string;
  reference: string;
  fullName: string;
  email: string;
  phone?: string;
  oldStatus?: string;
  newStatus: string;
  customerMessage?: string | null;
};

export type NotificationRecord = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  simulated: boolean;
  deliveryStatus: "simulated" | "sent" | "failed";
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

export interface DispatchOutcome {
  deliveryStatus: "simulated" | "sent" | "failed";
  providerId?: string;
  errorMessage?: string;
}

/**
 * Dispatches an email using Resend HTTP API when configured, or returns simulated.
 */
export async function dispatchEmail(to: string, subject: string, body: string): Promise<DispatchOutcome> {
  const isEnabled = areNotificationsEnabled();
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!isEnabled || !resendApiKey) {
    return { deliveryStatus: "simulated" };
  }

  try {
    const fromAddress = process.env.NOTIFICATIONS_FROM_EMAIL || "Divine Links <notifications@divinelinks.co>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        text: body
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      const sanitized = errText.slice(0, 300);
      console.error("[Notification Dispatch Error] Resend HTTP failure", { status: response.status, details: sanitized });
      return { deliveryStatus: "failed", errorMessage: `HTTP ${response.status}: ${sanitized}` };
    }

    const data = await response.json().catch(() => ({})) as { id?: string };
    return { deliveryStatus: "sent", providerId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    console.error("[Notification Dispatch Error] Unhandled network failure", message);
    return { deliveryStatus: "failed", errorMessage: message };
  }
}

/**
 * Persists a notification record both in memory and into the durable Supabase outbox table if available.
 */
async function recordNotification(
  record: NotificationRecord,
  enquiryId?: string,
  providerId?: string,
  errorMessage?: string
): Promise<void> {
  notificationLog.push(record);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  try {
    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    await supabase.from("notifications_outbox").insert({
      id: record.id,
      enquiry_id: enquiryId || null,
      recipient: record.recipient,
      channel: record.channel,
      subject: record.subject || "",
      body: record.body,
      status: record.deliveryStatus,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      provider_message_id: providerId || null,
      error_message: errorMessage || null,
      created_at: record.timestamp,
      sent_at: record.deliveryStatus === "sent" ? new Date().toISOString() : null,
      metadata: record.metadata || {}
    });
  } catch {
    // If the database outbox table is not yet migrated, in-memory log remains active.
  }
}

/**
 * Dispatches an automated confirmation email to the customer who submitted an enquiry.
 */
export async function sendCustomerEnquiryConfirmation(
  payload: EnquiryNotificationPayload
): Promise<NotificationRecord> {
  const subject = `Enquiry Received: ${payload.reference} - Divine Links`;
  const body = `Hello ${payload.fullName},

Thank you for contacting Divine Links. We have received your ${payload.service} enquiry for ${payload.location}.

Your unique reference number is: ${payload.reference}

Track your enquiry status online:
https://divinelinks.co/track

Next Steps:
1. Our technical team is reviewing your specifications and evaluating local infrastructure availability.
2. A representative will contact you via email (${payload.email}) or phone (${payload.phone}) to discuss verified options and quotation details.
3. Submitting an enquiry does not incur any fee or commitment.

Kind regards,
The Divine Links Team
https://divinelinks.co`;

  const outcome = await dispatchEmail(payload.email, subject, body);

  const record: NotificationRecord = {
    id: randomUUID(),
    channel: "email",
    recipient: payload.email,
    subject,
    body,
    simulated: outcome.deliveryStatus === "simulated",
    deliveryStatus: outcome.deliveryStatus,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      type: "customer_confirmation",
      service: payload.service,
      providerId: outcome.providerId
    }
  };

  await recordNotification(record, payload.enquiryId, outcome.providerId, outcome.errorMessage);

  if (outcome.deliveryStatus === "simulated") {
    console.info("[Notification Simulated - Customer Confirmation]", {
      recipient: payload.email,
      reference: payload.reference
    });
  }

  return record;
}

/**
 * Dispatches an operational alert to Divine Links internal staff desk.
 */
export async function sendAdminEnquiryAlert(
  payload: EnquiryNotificationPayload,
  adminEmail = "ops@divinelinks.co"
): Promise<NotificationRecord> {
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

  const outcome = await dispatchEmail(adminEmail, subject, body);

  const record: NotificationRecord = {
    id: randomUUID(),
    channel: "email",
    recipient: adminEmail,
    subject,
    body,
    simulated: outcome.deliveryStatus === "simulated",
    deliveryStatus: outcome.deliveryStatus,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      type: "admin_alert",
      providerId: outcome.providerId
    }
  };

  await recordNotification(record, payload.enquiryId, outcome.providerId, outcome.errorMessage);

  if (outcome.deliveryStatus === "simulated") {
    console.info("[Notification Simulated - Admin Alert]", {
      recipient: adminEmail,
      reference: payload.reference
    });
  }

  return record;
}

/**
 * Dispatches an automated update notice to a customer when enquiry status changes.
 * PRIVACY GUARANTEE: Internal staff notes are NEVER exposed in this notification.
 */
export async function sendStatusUpdateNotification(
  payload: StatusUpdateNotificationPayload
): Promise<NotificationRecord> {
  const humanStatus = payload.newStatus.replaceAll("_", " ").toUpperCase();
  const subject = `Update on your Enquiry ${payload.reference}: ${humanStatus}`;
  const body = `Hello ${payload.fullName},

We are writing to update you on the status of your Divine Links enquiry (Ref: ${payload.reference}).

Current Status: ${humanStatus}

Track your progress live:
https://divinelinks.co/track

${payload.customerMessage ? `Message from our operations team:\n"${payload.customerMessage}"\n` : ""}
If you have questions or wish to provide additional details, please contact us at ops@divinelinks.co.

Best regards,
The Divine Links Operations Desk`;

  const outcome = await dispatchEmail(payload.email, subject, body);

  const record: NotificationRecord = {
    id: randomUUID(),
    channel: "email",
    recipient: payload.email,
    subject,
    body,
    simulated: outcome.deliveryStatus === "simulated",
    deliveryStatus: outcome.deliveryStatus,
    timestamp: new Date().toISOString(),
    metadata: {
      reference: payload.reference,
      oldStatus: payload.oldStatus,
      newStatus: payload.newStatus,
      providerId: outcome.providerId
    }
  };

  await recordNotification(record, payload.enquiryId, outcome.providerId, outcome.errorMessage);

  if (outcome.deliveryStatus === "simulated") {
    console.info("[Notification Simulated - Status Change]", {
      recipient: payload.email,
      reference: payload.reference,
      newStatus: payload.newStatus
    });
  }

  return record;
}
