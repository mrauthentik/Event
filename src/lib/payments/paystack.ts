import crypto from "node:crypto";
import {
  PaymentProvider,
  InitializeCheckoutParams,
  CheckoutSessionResult,
  VerifyPaymentResult,
} from "./provider.interface";

export class PaystackProvider implements PaymentProvider {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
  }

  async initializeCheckout(params: InitializeCheckoutParams): Promise<CheckoutSessionResult> {
    // Paystack amounts in kobo
    const payload = {
      reference: params.orderReference,
      amount: params.amountMinor, // Already in minor units (kobo)
      currency: params.currency,
      email: params.payerEmail || `${params.orderReference.toLowerCase()}@attendee.invalid`,
      callback_url: params.callbackUrl,
      metadata: {
        orderId: params.orderId,
        orderReference: params.orderReference,
        payerName: params.payerName,
        payerPhone: params.payerPhoneE164,
        custom_fields: [
          { display_name: "Event", variable_name: "event", value: "IHGC 2026" },
          { display_name: "Order Ref", variable_name: "order_ref", value: params.orderReference },
        ],
      },
    };

    // If mock/sandbox key without live network
    if (process.env.MOCK_PAYMENTS === "true" && process.env.NODE_ENV !== "production") {
      const checkoutUrl = new URL(params.callbackUrl);
      checkoutUrl.searchParams.set("ref", params.orderReference);
      return {
        provider: "paystack",
        checkoutUrl: checkoutUrl.toString(),
        providerRef: params.orderReference,
        rawPayload: { mock: true },
      };
    }

    if (!this.secretKey || this.secretKey.startsWith("sk_test_mock")) {
      throw new Error("Paystack is not configured with a valid secret key.");
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    if (!data.status || !data.data) {
      throw new Error("Paystack checkout initialization failed.");
    }

    return {
      provider: "paystack",
      checkoutUrl: data.data.authorization_url,
      providerRef: data.data.reference,
      rawPayload: data,
    };
  }

  async verifyPayment(providerRef: string): Promise<VerifyPaymentResult> {
    if (!this.secretKey || this.secretKey.startsWith("sk_test_mock")) {
      return {
        isSuccessful: false,
        isPending: true,
        providerRef,
        amountMinor: 0,
        currency: "NGN",
        error: "Paystack is not configured.",
      };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(providerRef)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    if (!data.status || !data.data) {
      return {
        isSuccessful: false,
        isPending: false,
        providerRef,
        amountMinor: 0,
        currency: "NGN",
        error: data.message || "Verification failed",
      };
    }

    const tx = data.data;
    const isSuccessful = tx.status === "success";
    const isPending = tx.status === "pending" || tx.status === "ongoing";

    return {
      isSuccessful,
      isPending,
      providerRef: tx.reference,
      amountMinor: tx.amount,
      currency: tx.currency.toUpperCase(),
      payerEmail: tx.customer?.email,
    };
  }

  async verifyWebhookSignature(rawBody: string, headers: Headers): Promise<boolean> {
    const signature = headers.get("x-paystack-signature");
    if (!signature || !this.secretKey || this.secretKey.startsWith("sk_test_mock")) {
      return false;
    }

    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    const expected = Buffer.from(hash, "hex");
    const actual = Buffer.from(signature, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
  }
}

