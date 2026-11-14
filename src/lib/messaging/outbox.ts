import { randomUUID } from "node:crypto";
import type { InferInsertModel } from "drizzle-orm";
import { notificationJobs } from "@/db/schema/jobs";
import { createOrderAccessToken } from "@/lib/crypto/ed25519";

type JobInsert = InferInsertModel<typeof notificationJobs>;
type OrderForNotifications = {
  id: string;
  reference: string;
  payerEmail: string | null;
};
type AttendeeForNotifications = {
  id: string;
  name: string;
  refCode: string;
  phoneE164: string;
  email: string | null;
};

/** Build channel-specific jobs so the SMS record does not also store an email address (and vice versa). */
export async function buildTicketNotificationJobs(
  order: OrderForNotifications,
  orderAttendees: AttendeeForNotifications[],
  options: { appUrl?: string; resend?: boolean } = {},
): Promise<JobInsert[]> {
  if (orderAttendees.length === 0) return [];
  const configuredAppUrl = options.appUrl || process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!configuredAppUrl && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured before ticket notifications can be queued.");
  }
  const appUrl = (configuredAppUrl || "http://localhost:3000").replace(/\/$/, "");
  const accessToken = await createOrderAccessToken(order.id);
  const ticketUrl = `${appUrl}/ticket/${encodeURIComponent(order.reference)}?access=${encodeURIComponent(accessToken)}`;
  const resendPrefix = options.resend ? `resend:${randomUUID()}:` : "ticket:";

  return orderAttendees.flatMap((attendee) => {
    const common = { attendeeName: attendee.name, refCode: attendee.refCode, ticketUrl };
    const jobs: JobInsert[] = [{
      orderId: order.id,
      attendeeId: attendee.id,
      channel: "sms",
      payload: { ...common, phoneE164: attendee.phoneE164, email: null },
      idempotencyKey: `${resendPrefix}${attendee.id}:sms`,
    }];
    const email = attendee.email || order.payerEmail;
    if (email) {
      jobs.push({
        orderId: order.id,
        attendeeId: attendee.id,
        channel: "email",
        payload: { ...common, phoneE164: "", email },
        idempotencyKey: `${resendPrefix}${attendee.id}:email`,
      });
    }
    return jobs;
  });
}
