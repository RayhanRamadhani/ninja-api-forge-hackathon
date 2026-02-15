import { fetchOrderbook } from "@/app/lib/injective";
import { calcSpread, calcPressure } from "@/app/services/marketInsight";
import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{
    symbol: string;
  }>;
}

// Cache this route for 5 seconds (orderbook changes fast)
export const revalidate = 5;

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Await params (Next.js 15 requirement)
    const params = await context.params;

    // 1. Check if symbol exists
    if (!params.symbol || params.symbol.trim() === '') {
      return Response.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      );
    }

    const rawSymbol = params.symbol.trim();

    // 2. Check length (prevent excessively long input)
    if (rawSymbol.length > 100) {
      return Response.json(
        { error: 'Symbol parameter too long (max 100 characters)' },
        { status: 400 }
      );
    }

    // 3. Check for valid characters (alphanumeric, dash, underscore, slash)
    // Injective market IDs can be hex strings or ticker format like INJ/USDT
    const validSymbolPattern = /^[a-zA-Z0-9\-_\/\.x]+$/;
    if (!validSymbolPattern.test(rawSymbol)) {
      return Response.json(
        { error: 'Symbol contains invalid characters' },
        { status: 400 }
      );
    }

    const symbol = rawSymbol.toUpperCase();
    const book = await fetchOrderbook(symbol);

    const spread = calcSpread(book);
    const pressure = calcPressure(book);

    return Response.json({
      symbol,
      spread: Number(spread.toFixed(4)),
      buyPressure: Number(pressure.buyPressure.toFixed(2)),
      sellPressure: Number(pressure.sellPressure.toFixed(2))
    });
  } catch (error) {
    console.error('Error in market insight endpoint:', error);
    return Response.json(
      { 
        error: 'Failed to fetch market insight',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
