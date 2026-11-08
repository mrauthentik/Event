import { SupportedCurrency } from "@/config/currencies";

export interface InitializeCheckoutParams {
  orderId: string;
  orderReference: string;
  amountMinor: number;
  currency: SupportedCurrency;
  payerName: string;
  payerPhoneE164: string;
  payerEmail?: string | null;
  callbackUrl: string;
}

export interface CheckoutSessionResult {
  provider: "paystack" | "paypal" | "manual_transfer";
  checkoutUrl?: string; // Redirect URL for hosted checkout
  providerRef: string; // Paystack access_code / PayPal order_id
  rawPayload?: any;
}

export interface VerifyPaymentResult {
  isSuccessful: boolean;
  isPending: boolean;
  providerRef: string;
  amountMinor: number;
  currency: SupportedCurrency;
  captureId?: string;
  payerEmail?: string;
  error?: string;
}

export interface PaymentProvider {
  initializeCheckout(params: InitializeCheckoutParams): Promise<CheckoutSessionResult>;
  verifyPayment(providerRef: string): Promise<VerifyPaymentResult>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
}

