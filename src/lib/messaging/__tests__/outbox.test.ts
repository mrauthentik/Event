import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildTicketNotificationJobs } from "../outbox";

const originalSigningKey = process.env.TICKET_SIGNING_PRIVATE_KEY;
const signingKey = "1".repeat(64);

beforeAll(() => {
  process.env.TICKET_SIGNING_PRIVATE_KEY = signingKey;
});

afterAll(() => {
  if (originalSigningKey === undefined) delete process.env.TICKET_SIGNING_PRIVATE_KEY;
  else process.env.TICKET_SIGNING_PRIVATE_KEY = originalSigningKey;
});

describe("ticket notification outbox payloads", () => {
  it("creates isolated SMS and email jobs with a signed ticket link", async () => {
    const jobs = await buildTicketNotificationJobs({
      id: "e49f2e1d-85c0-4779-a544-24b3ba93a20c",
      reference: "HGC-123456",
      payerEmail: "payer@example.com",
    }, [{
      id: "79cc4e29-8f37-4c0f-b2dc-1f153762e12a",
      name: "Attendee One",
      refCode: "HGC-000001",
      phoneE164: "+2348012345678",
      email: null,
    }], { appUrl: "https://tickets.example.test" });

    expect(jobs).toHaveLength(2);
    const sms = jobs.find((job) => job.channel === "sms")!;
    const email = jobs.find((job) => job.channel === "email")!;
    expect(sms.payload.phoneE164).toBe("+2348012345678");
    expect(sms.payload.email).toBeNull();
    expect(email.payload.email).toBe("payer@example.com");
    expect(email.payload.phoneE164).toBe("");
    expect(sms.payload.ticketUrl).toMatch(/^https:\/\/tickets\.example\.test\/ticket\/HGC-123456\?access=.+/);
    expect(sms.idempotencyKey).toBe("ticket:79cc4e29-8f37-4c0f-b2dc-1f153762e12a:sms");
  });

  it("creates a fresh idempotency key for each requested recovery resend", async () => {
    const order = { id: "e49f2e1d-85c0-4779-a544-24b3ba93a20c", reference: "HGC-123456", payerEmail: null };
    const attendee = [{
      id: "79cc4e29-8f37-4c0f-b2dc-1f153762e12a",
      name: "Attendee One",
      refCode: "HGC-000001",
      phoneE164: "+2348012345678",
      email: null,
    }];
    const first = await buildTicketNotificationJobs(order, attendee, { appUrl: "https://tickets.example.test", resend: true });
    const second = await buildTicketNotificationJobs(order, attendee, { appUrl: "https://tickets.example.test", resend: true });
    expect(first[0].idempotencyKey).not.toBe(second[0].idempotencyKey);
    expect(first[0].idempotencyKey).toMatch(/^resend:/);
  });

  it("does not create jobs for an empty attendee list", async () => {
    await expect(buildTicketNotificationJobs({
      id: "e49f2e1d-85c0-4779-a544-24b3ba93a20c",
      reference: "HGC-123456",
      payerEmail: null,
    }, [])).resolves.toEqual([]);
  });
});
