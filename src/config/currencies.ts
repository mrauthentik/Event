export type SupportedCurrency = "NGN" | "USD" | "EUR" | "GBP";

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  minorUnitMultiplier: number; // e.g. 100 for kobo/cents/pence
  standardPriceMinor: number;
  label: string;
  defaultProvider: "paystack" | "paypal";
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: {
    code: "NGN",
    symbol: "₦",
    minorUnitMultiplier: 100,
    standardPriceMinor: 500_000, // 5,000 NGN in kobo
    label: "Nigerian Naira (NGN)",
    defaultProvider: "paystack",
  },
  USD: {
    code: "USD",
    symbol: "$",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // $20.00 in cents
    label: "US Dollar (USD)",
    defaultProvider: "paypal",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // €20.00 in cents
    label: "Euro (EUR)",
    defaultProvider: "paypal",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    minorUnitMultiplier: 100,
    standardPriceMinor: 2_000, // £20.00 in pence
    label: "British Pound (GBP)",
    defaultProvider: "paypal",
  },
};

export function formatMoneyMinor(amountMinor: number, currency: SupportedCurrency): string {
  const config = CURRENCIES[currency];
  const major = amountMinor / config.minorUnitMultiplier;
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: currency === "NGN" ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(major);
}
