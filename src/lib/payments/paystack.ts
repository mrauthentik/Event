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
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "sk_test_mock_paystack_secret";
  }

  async initializeCheckout(params: InitializeCheckoutParams): Promise<CheckoutSessionResult> {
    // Paystack amounts in kobo
    const payload = {
      reference: params.orderReference,
      amount: params.amountMinor, // Already in minor units (kobo)
      currency: params.currency,
      email: params.payerEmail || `${params.orderReference.toLowerCase()}@horemow-attendee.org`,
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
    if (this.secretKey.startsWith("sk_test_mock") || process.env.MOCK_PAYMENTS === "true") {
      return {
        provider: "paystack",
        checkoutUrl: `/payment/status?ref=${params.orderReference}&mock_success=true`,
        providerRef: params.orderReference,
        rawPayload: { mock: true },
      };
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.status || !data.data) {
      throw new Error(`Paystack initialization failed: ${data.message || "Unknown error"}`);
    }

    return {
      provider: "paystack",
      checkoutUrl: data.data.authorization_url,
      providerRef: data.data.reference,
      rawPayload: data,
    };
  }

  async verifyPayment(providerRef: string): Promise<VerifyPaymentResult> {
    if (this.secretKey.startsWith("sk_test_mock") || process.env.MOCK_PAYMENTS === "true") {
      return {
        isSuccessful: true,
        isPending: false,
        providerRef,
        amountMinor: 500_000,
        currency: "NGN",
      };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(providerRef)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
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

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
    const signature = headers["x-paystack-signature"];
    if (!signature || typeof signature !== "string") {
      return false;
    }

    const hash = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }
}
