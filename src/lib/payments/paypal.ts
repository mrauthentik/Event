import {
  PaymentProvider,
  InitializeCheckoutParams,
  CheckoutSessionResult,
  VerifyPaymentResult,
} from "./provider.interface";

function decimalToMinorUnits(value: unknown): number {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return 0;
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : 0;
}

export class PayPalProvider implements PaymentProvider {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || "";
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("PayPal is not configured with client credentials.");
    }
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const data = await response.json();
    if (!data.access_token) {
      throw new Error(`Failed to obtain PayPal OAuth token: ${JSON.stringify(data)}`);
    }
    return data.access_token;
  }

  async initializeCheckout(params: InitializeCheckoutParams): Promise<CheckoutSessionResult> {
    // If mock credentials or local development
    if (process.env.MOCK_PAYMENTS === "true" && process.env.NODE_ENV !== "production") {
      const checkoutUrl = new URL(params.callbackUrl);
      checkoutUrl.searchParams.set("ref", params.orderReference);
      return {
        provider: "paypal",
        checkoutUrl: checkoutUrl.toString(),
        providerRef: `PAYPAL-${params.orderReference}`,
        rawPayload: { mock: true },
      };
    }

    const token = await this.getAccessToken();
    const majorAmount = `${Math.floor(params.amountMinor / 100)}.${String(params.amountMinor % 100).padStart(2, "0")}`;
    const returnUrl = new URL(params.callbackUrl);
    returnUrl.searchParams.set("ref", params.orderReference);
    const cancelUrl = new URL(params.callbackUrl);
    cancelUrl.searchParams.set("ref", params.orderReference);
    cancelUrl.searchParams.set("cancelled", "true");

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderReference,
          description: `IHGC 2026 Registration (${params.orderReference})`,
          custom_id: params.orderReference,
          invoice_id: params.orderReference,
          amount: {
            currency_code: params.currency,
            value: majorAmount,
          },
        },
      ],
      application_context: {
        brand_name: "Horemow IHGC 2026",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        return_url: returnUrl.toString(),
        cancel_url: cancelUrl.toString(),
      },
    };

    const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `create_${params.orderReference}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const order = await response.json();
    if (!order.id) {
      throw new Error("PayPal order creation failed.");
    }

    const approveLink = order.links?.find((l: any) => l.rel === "approve")?.href;

    return {
      provider: "paypal",
      checkoutUrl: approveLink,
      providerRef: order.id,
      rawPayload: order,
    };
  }

  async captureOrder(paypalOrderId: string): Promise<VerifyPaymentResult> {
    if (!this.clientId || !this.clientSecret) {
      return {
        isSuccessful: false,
        isPending: true,
        providerRef: paypalOrderId,
        amountMinor: 0,
        currency: "USD",
        error: "PayPal is not configured.",
      };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture_${paypalOrderId}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    return this.parseOrderData(data, paypalOrderId);
  }

  async verifyPayment(providerRef: string): Promise<VerifyPaymentResult> {
    if (!this.clientId || !this.clientSecret) {
      return {
        isSuccessful: false,
        isPending: true,
        providerRef,
        amountMinor: 0,
        currency: "USD",
        error: "PayPal is not configured.",
      };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${providerRef}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.json();
    return this.parseOrderData(data, providerRef);
  }

  private parseOrderData(data: any, providerRef: string): VerifyPaymentResult {
    const status = data.status;
    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = capture?.status;

    // Completed capture means fully paid
    const isSuccessful = status === "COMPLETED" || captureStatus === "COMPLETED";
    // PENDING capture (under review) MUST NOT issue a ticket
    const isPending = status === "PENDING" || captureStatus === "PENDING";

    const value = capture?.amount?.value || data.purchase_units?.[0]?.amount?.value || "0";
    const amountMinor = decimalToMinorUnits(value);
    const currency = (capture?.amount?.currency_code || data.purchase_units?.[0]?.amount?.currency_code || "USD").toUpperCase();

    return {
      isSuccessful,
      isPending,
      providerRef,
      captureId: capture?.id,
      amountMinor,
      currency,
      payerEmail: data.payer?.email_address,
      orderReference:
        data.purchase_units?.[0]?.custom_id ||
        data.purchase_units?.[0]?.invoice_id ||
        data.purchase_units?.[0]?.reference_id,
      error: isSuccessful || isPending ? undefined : `PayPal status: ${status || "UNKNOWN"}`,
    };
  }

  async verifyWebhookSignature(rawBody: string, headers: Headers): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return false;

    let webhookEvent: unknown;
    try {
      webhookEvent = JSON.parse(rawBody);
    } catch {
      return false;
    }

    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionTime = headers.get("paypal-transmission-time");
    const certUrl = headers.get("paypal-cert-url");
    const authAlgo = headers.get("paypal-auth-algo");
    const transmissionSig = headers.get("paypal-transmission-sig");
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;

    try {
      const accessToken = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json();
      return response.ok && data.verification_status === "SUCCESS";
    } catch {
      return false;
    }
  }
}

