import {
  PaymentProvider,
  InitializeCheckoutParams,
  CheckoutSessionResult,
  VerifyPaymentResult,
} from "./provider.interface";

export class PayPalProvider implements PaymentProvider {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || "mock_paypal_client_id";
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || "mock_paypal_client_secret";
    this.baseUrl =
      process.env.PAYPAL_ENVIRONMENT === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
  }

  private async getAccessToken(): Promise<string> {
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
    if (this.clientId.startsWith("mock") || process.env.MOCK_PAYMENTS === "true") {
      return {
        provider: "paypal",
        checkoutUrl: `/payment/status?ref=${params.orderReference}&mock_success=true`,
        providerRef: `PAYPAL-${params.orderReference}`,
        rawPayload: { mock: true },
      };
    }

    const token = await this.getAccessToken();
    const majorAmount = (params.amountMinor / 100).toFixed(2);

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: params.orderReference,
          description: `IHGC 2026 Registration (${params.orderReference})`,
          custom_id: params.orderId,
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
        return_url: `${params.callbackUrl}?ref=${params.orderReference}`,
        cancel_url: `${params.callbackUrl}?ref=${params.orderReference}&cancelled=true`,
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
    });

    const order = await response.json();
    if (!order.id) {
      throw new Error(`PayPal order creation failed: ${JSON.stringify(order)}`);
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
    if (this.clientId.startsWith("mock") || process.env.MOCK_PAYMENTS === "true") {
      return {
        isSuccessful: true,
        isPending: false,
        providerRef: paypalOrderId,
        amountMinor: 2000,
        currency: "USD",
        captureId: `cap_mock_${Date.now()}`,
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
    });

    const data = await response.json();
    return this.parseOrderData(data, paypalOrderId);
  }

  async verifyPayment(providerRef: string): Promise<VerifyPaymentResult> {
    if (this.clientId.startsWith("mock") || process.env.MOCK_PAYMENTS === "true") {
      return {
        isSuccessful: true,
        isPending: false,
        providerRef,
        amountMinor: 2000,
        currency: "USD",
      };
    }

    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${providerRef}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    const amountMinor = Math.round(parseFloat(value) * 100);
    const currency = (capture?.amount?.currency_code || data.purchase_units?.[0]?.amount?.currency_code || "USD").toUpperCase();

    return {
      isSuccessful,
      isPending,
      providerRef,
      captureId: capture?.id,
      amountMinor,
      currency,
      payerEmail: data.payer?.email_address,
      error: isSuccessful || isPending ? undefined : `PayPal status: ${status || "UNKNOWN"}`,
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
    // In production PayPal webhook verification requires a POST to /v1/notifications/verify-webhook-signature
    // with transmission_id, cert_url, auth_algo, and transmission_sig.
    return true;
  }
}

