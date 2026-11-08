import { SupportedCurrency } from "@/config/currencies";
import { PaymentProvider } from "./provider.interface";
import { PaystackProvider } from "./paystack";
import { PayPalProvider } from "./paypal";

const paystack = new PaystackProvider();
const paypal = new PayPalProvider();

export function getPaymentProvider(currency: SupportedCurrency): PaymentProvider {
  switch (currency) {
    case "NGN":
      return paystack;
    case "USD":
    case "EUR":
    case "GBP":
      return paypal;
    default:
      return paystack;
  }
}

export { paystack, paypal };
export * from "./provider.interface";
