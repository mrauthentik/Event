import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendees, notificationJobs, orders } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function MessagingQueuePage() {
  const deadJobs = await db.select({
    id: notificationJobs.id,
    channel: notificationJobs.channel,
    attempts: notificationJobs.attempts,
    lastError: notificationJobs.lastError,
    createdAt: notificationJobs.createdAt,
    attendeeName: attendees.name,
    reference: orders.reference,
  }).from(notificationJobs)
    .innerJoin(attendees, eq(notificationJobs.attendeeId, attendees.id))
    .innerJoin(orders, eq(notificationJobs.orderId, orders.id))
    .where(eq(notificationJobs.status, "dead"))
    .orderBy(desc(notificationJobs.createdAt))
    .limit(100);

  return (
    <main className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Operations</p>
        <h1 className="mt-1 text-2xl font-black text-[#111320]">Messaging dead letters</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Failed ticket SMS and email jobs after eight attempts. Contact details and ticket links are hidden here.
        </p>
      </header>

      {deadJobs.length === 0 ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
          No failed messages are waiting for review.
        </section>
      ) : (
        <section className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Attendee</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Last attempt</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deadJobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{job.attendeeName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{job.reference}</td>
                  <td className="px-4 py-3 uppercase">{job.channel}</td>
                  <td className="px-4 py-3">{job.attempts}</td>
                  <td className="px-4 py-3 text-gray-600">{job.createdAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}</td>
                  <td className="px-4 py-3">
                    <form action={`/api/admin/notifications/${job.id}/retry`} method="post">
                      <button className="rounded-lg bg-[#0E1020] px-3 py-2 text-xs font-bold text-white hover:bg-[#20243a]">
                        Retry
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
