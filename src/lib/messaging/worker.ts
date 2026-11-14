import { and, asc, eq, isNotNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { notificationJobs } from "@/db/schema";
import { deliverTicketChannel } from "@/lib/messaging";

const MAX_ATTEMPTS = 8;
const BATCH_SIZE = 20;
const CONCURRENCY = 5;
const STALE_LOCK_MS = 10 * 60 * 1000;

export async function processNotificationQueue() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const claimed = await db.transaction(async (tx) => {
    const due = await tx.select().from(notificationJobs).where(or(
      and(eq(notificationJobs.status, "queued"), lte(notificationJobs.availableAt, now)),
      and(
        eq(notificationJobs.status, "processing"),
        isNotNull(notificationJobs.lockedAt),
        lte(notificationJobs.lockedAt, staleBefore),
      ),
    )).orderBy(asc(notificationJobs.availableAt)).limit(BATCH_SIZE)
      .for("update", { skipLocked: true });

    const jobs = [];
    for (const job of due) {
      const attempts = job.attempts + 1;
      await tx.update(notificationJobs).set({
        status: "processing",
        attempts,
        lockedAt: now,
        updatedAt: now,
      }).where(eq(notificationJobs.id, job.id));
      jobs.push({ ...job, attempts });
    }
    return jobs;
  });

  const result = { claimed: claimed.length, delivered: 0, retried: 0, dead: 0 };
  async function processJob(job: (typeof claimed)[number]): Promise<"delivered" | "retried" | "dead"> {
    let delivered = false;
    try {
      delivered = await deliverTicketChannel({
        attendeeName: job.payload.attendeeName,
        refCode: job.payload.refCode,
        phoneE164: job.payload.phoneE164 || "",
        email: job.payload.email || null,
        ticketUrl: job.payload.ticketUrl,
      }, job.channel);
    } catch {
      // Provider code should not throw, but keep the job retryable if an unexpected error occurs.
      delivered = false;
    }

    if (delivered) {
      await db.update(notificationJobs).set({
        status: "delivered",
        lockedAt: null,
        lastError: null,
        updatedAt: new Date(),
      }).where(eq(notificationJobs.id, job.id));
      return "delivered";
    }

    if (job.attempts >= MAX_ATTEMPTS) {
      await db.update(notificationJobs).set({
        status: "dead",
        lockedAt: null,
        lastError: "provider_delivery_failed",
        updatedAt: new Date(),
      }).where(eq(notificationJobs.id, job.id));
      return "dead";
    }

    const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attempts - 1));
    await db.update(notificationJobs).set({
      status: "queued",
      availableAt: new Date(Date.now() + delayMinutes * 60_000),
      lockedAt: null,
      lastError: "provider_delivery_failed",
      updatedAt: new Date(),
    }).where(eq(notificationJobs.id, job.id));
    return "retried";
  }

  for (let offset = 0; offset < claimed.length; offset += CONCURRENCY) {
    const outcomes = await Promise.all(claimed.slice(offset, offset + CONCURRENCY).map(processJob));
    for (const outcome of outcomes) result[outcome]++;
  }
  return result;
}
