import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { CURRENCIES, SupportedCurrency } from "@/config/currencies";
import { db } from "@/db";
import { eventSettings, providerRoutes, ticketPrices, ticketTypes } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const type = await db.query.ticketTypes.findFirst({ where: (row, { eq }) => eq(row.isActive, true) });
    const configuredPrices = type
      ? await db.select({ currency: ticketPrices.currency, amountMinor: ticketPrices.amountMinor })
          .from(ticketPrices).where(eq(ticketPrices.ticketTypeId, type.id))
      : [];
    const prices: Record<SupportedCurrency, number> = {
      NGN: CURRENCIES.NGN.standardPriceMinor,
      USD: CURRENCIES.USD.standardPriceMinor,
      EUR: CURRENCIES.EUR.standardPriceMinor,
      GBP: CURRENCIES.GBP.standardPriceMinor,
    };
    for (const price of configuredPrices) prices[price.currency] = price.amountMinor;

    const routes = await db.select({ currency: providerRoutes.currency, provider: providerRoutes.primaryProvider, isEnabled: providerRoutes.isEnabled }).from(providerRoutes);
    const availability: Record<SupportedCurrency, boolean> = { NGN: true, USD: true, EUR: true, GBP: true };
    for (const route of routes) availability[route.currency] = route.isEnabled && route.provider !== "manual_transfer";
    const providers: Record<SupportedCurrency, string> = {
      NGN: CURRENCIES.NGN.defaultProvider,
      USD: CURRENCIES.USD.defaultProvider,
      EUR: CURRENCIES.EUR.defaultProvider,
      GBP: CURRENCIES.GBP.defaultProvider,
    };
    for (const route of routes) providers[route.currency] = route.provider;

    const [settings] = await db.select({ registrationDeadline: eventSettings.registrationDeadline }).from(eventSettings).limit(1);
    const deadline = settings?.registrationDeadline ?? new Date("2026-12-11T23:59:59+01:00");
    return NextResponse.json({
      pricesMinor: prices,
      currencyAvailable: availability,
      providerByCurrency: providers,
      registrationOpen: Date.now() <= deadline.getTime(),
    }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=60" } });
  } catch {
    console.error("Public registration configuration unavailable.");
    return NextResponse.json({ error: "Registration pricing is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
