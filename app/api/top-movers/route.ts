import { fetchMarketsSummary, MarketSummary } from "@/app/lib/injective";

// Cache this route for 30 seconds
export const revalidate = 30;

export async function GET() {
  try {
    const all = await fetchMarketsSummary();
    
    // Validate we have data
    if (!all || all.length === 0) {
      return Response.json(
        { error: 'No market data available' },
        { status: 404 }
      );
    }
    
    // Sort by 24h change
    const sorted = all.sort((a: MarketSummary, b: MarketSummary) => 
      b.change24h - a.change24h
    );

    return Response.json({
      topGainers: sorted.slice(0, 5),
      topLosers: sorted.slice(-5).reverse()
    });
  } catch (error) {
    console.error('Error in top movers endpoint:', error);
    return Response.json(
      { 
        error: 'Failed to fetch top movers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
