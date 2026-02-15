export const INJ_INDEXER_BASE = "https://sentry.lcd.injective.network"; // Injective LCD endpoint
export const INJ_INDEXER_API = "https://k8s.global.mainnet.api.injective.network"; // Injective Indexer API (same as pyinjective)

// Type definitions
export interface OrderbookEntry {
  price: string;
  quantity: string;
}

export interface Orderbook {
  bids: [string, string][];
  asks: [string, string][];
}

export interface MarketSummary {
  marketId: string;
  symbol: string;
  lastPrice: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = {
  ORDERBOOK: 5 * 1000,      // 5 seconds for orderbook (fast-changing)
  MARKETS: 60 * 1000,       // 1 minute for markets summary
};

function getCached<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export async function fetchOrderbook(marketId: string): Promise<Orderbook> {
  const cacheKey = `orderbook:${marketId}`;
  
  // Check cache first
  const cached = getCached<Orderbook>(cacheKey, CACHE_TTL.ORDERBOOK);
  if (cached) return cached;
  
  try {
    // Try Indexer API v2 endpoint (same as pyinjective SDK)
    const res = await fetch(`${INJ_INDEXER_API}/api/indexer/spot/v2/orderbook?market_id=${marketId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch orderbook: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Parse orderbook from Indexer API v2 response (pyinjective format)
    const orderbookData = data.orderbook || data;
    const buys = orderbookData.buys || [];
    const sells = orderbookData.sells || [];
    
    // Convert to tuple format [price, quantity]
    const bids: [string, string][] = buys.map((level: any) => [
      level.price || '0',
      level.quantity || '0'
    ]);
    
    const asks: [string, string][] = sells.map((level: any) => [
      level.price || '0',
      level.quantity || '0'
    ]);
    
    const orderbook = { bids, asks };
    setCache(cacheKey, orderbook);
    return orderbook;
  } catch (error) {
    throw new Error(`Unable to fetch orderbook for ${marketId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function fetchMarketsSummary(): Promise<MarketSummary[]> {
  const cacheKey = 'markets:summary';
  
  // Check cache first
  const cached = getCached<MarketSummary[]>(cacheKey, CACHE_TTL.MARKETS);
  if (cached) return cached;
  
  try {
    // Try multiple Injective Indexer API endpoints (same as pyinjective)
    const endpoints = [
      `${INJ_INDEXER_API}/api/indexer/spot/v2/markets`,
      `${INJ_INDEXER_BASE}/injective/exchange/v1beta1/spot/markets`,
      `https://api.injective.network/api/chronos/v1/spot/markets`,
    ];
    
    let data: any = null;
    let successEndpoint = '';
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (res.ok) {
          data = await res.json();
          successEndpoint = endpoint;
          break;
        }
      } catch (err) {
        continue;
      }
    }
    
    if (!data) {
      throw new Error('All Injective API endpoints failed');
    }
    
    // Try different possible data structures
    const markets = data.markets || data.data || [];
    
    if (markets.length === 0) {
      throw new Error('No markets data received from API');
    }
    
    // Transform to summary format
    const transformed = markets.map((market: any) => {
      // Try all possible field name variations
      const marketId = market.marketId || market.market_id || market.id || '';
      const symbol = market.ticker || market.symbol || market.marketCode || 
                    market.base_token?.symbol + '/' + market.quote_token?.symbol || 'UNKNOWN';
      
      // Parse price
      const priceStr = market.lastPrice || market.last_price || 
                      market.price || market.markPrice || market.mark_price || '0';
      const lastPrice = parseFloat(priceStr);
      
      // Parse volume
      const volumeStr = market.volume || market.volumeToken0 || 
                       market.baseVolume || market.volume24h || '0';
      const volume24h = parseFloat(volumeStr);
      
      // Parse price change percentage
      const changeStr = market.changeRate || market.change || 
                       market.priceChangePercentage || market.change24h || '0';
      let change24h = parseFloat(changeStr);
      
      // Convert to percentage if it's a decimal
      if (!isNaN(change24h) && Math.abs(change24h) < 1 && change24h !== 0) {
        change24h = change24h * 100;
      }
      
      // Parse high/low
      const highStr = market.high || market.highPrice || market.high24h || '0';
      const lowStr = market.low || market.lowPrice || market.low24h || '0';
      
      let high24h = parseFloat(highStr);
      let low24h = parseFloat(lowStr);
      
      // Estimate from last price if no data
      if (isNaN(high24h) || high24h === 0) {
        high24h = lastPrice > 0 ? lastPrice * 1.05 : 0;
      }
      if (isNaN(low24h) || low24h === 0) {
        low24h = lastPrice > 0 ? lastPrice * 0.95 : 0;
      }
      
      return {
        marketId,
        symbol,
        lastPrice: isNaN(lastPrice) ? 0 : lastPrice,
        volume24h: isNaN(volume24h) ? 0 : volume24h,
        change24h,
        high24h: isNaN(high24h) ? 0 : high24h,
        low24h: isNaN(low24h) ? 0 : low24h,
      };
    });
    
    setCache(cacheKey, transformed);
    return transformed;
  } catch (error) {
    throw new Error(`Failed to fetch markets summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
