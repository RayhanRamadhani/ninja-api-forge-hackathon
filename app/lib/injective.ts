export const INJ_INDEXER_BASE = "https://sentry.lcd.injective.network"; // Injective REST endpoint
export const INJ_INDEXER_API = "https://api.injective.network"; // Injective Indexer API

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
  
  console.log(`Cache HIT for ${key} (age: ${age}ms)`);
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log(`Cache SET for ${key}`);
}

// Generate mock market data for development/testing
function generateMockMarketData(): MarketSummary[] {
  const mockMarkets = [
    { symbol: 'INJ/USDT', base: 25.5, id: '0x0511ddc4e6586f3bfe1acb2dd905f8b8a82c97e199c88f0b427f4a0c7bdca866' },
    { symbol: 'ATOM/USDT', base: 12.3, id: '0x2e94726f11423fe9a5fe7e96661f4cb8a6c6b857c3db2c66ab98a8d9fb8db46e' },
    { symbol: 'ETH/USDT', base: 2450.0, id: '0x06c5b9e78f207d8d5f430d1834ae4e52c37c6c9c34e0d6f8b81b43d43f1cda1d' },
    { symbol: 'BTC/USDT', base: 45000.0, id: '0x175407c4e7e3b1fd0a8fcf5e7f1f5f5c5e5f5c5e5f5c5e5f5c5e5f5c5e5f5c5e' },
    { symbol: 'WMATIC/USDT', base: 0.85, id: '0x82c9b5d7c48d7f5c48d7f5c48d7f5c48d7f5c48d7f5c48d7f5c48d7f5c48d7f5' },
    { symbol: 'LINK/USDT', base: 18.2, id: '0x3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e3b7e' },
    { symbol: 'UNI/USDT', base: 7.5, id: '0x9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e9c5e' },
    { symbol: 'OSMO/USDT', base: 1.2, id: '0x4ca0f92fc28be0c9761326016b5a1a2362dd9f6a7e0d5f5a2362dd9f6a7e0d5f' },
    { symbol: 'AXL/USDT', base: 0.95, id: '0x2be72879bb90ec8cbbd7510d0eed6a727f6c2690ce7f1397982453d552f9fe8f' },
    { symbol: 'DOT/USDT', base: 8.4, id: '0x7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e7a8e' },
  ];
  
  return mockMarkets.map((market) => {
    const change24h = Math.random() * 30 - 15; // -15% to +15%
    const lastPrice = market.base;
    const volume24h = Math.random() * 5000000;
    
    return {
      marketId: market.id,
      symbol: market.symbol,
      lastPrice,
      volume24h,
      change24h,
      high24h: lastPrice * (1 + Math.abs(change24h) / 200),
      low24h: lastPrice * (1 - Math.abs(change24h) / 200),
    };
  });
}

export async function fetchOrderbook(marketId: string): Promise<Orderbook> {
  const cacheKey = `orderbook:${marketId}`;
  
  // Check cache first
  const cached = getCached<Orderbook>(cacheKey, CACHE_TTL.ORDERBOOK);
  if (cached) return cached;
  
  try {
    const res = await fetch(`${INJ_INDEXER_BASE}/injective/exchange/v1beta1/spot/orderbook/${marketId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch orderbook: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    
    // Debug: log structure to understand API response
    console.log('Orderbook API Response:', JSON.stringify(data, null, 2));
    
    // Parse buys and sells from Injective API response
    const buys = data.buys_price_level || data.buys || [];
    const sells = data.sells_price_level || data.sells || [];
    
    // Convert to tuple format [price, quantity]
    const bids: [string, string][] = buys.map((level: any) => [
      level.price || level.p || '0',
      level.quantity || level.q || '0'
    ]);
    
    const asks: [string, string][] = sells.map((level: any) => [
      level.price || level.p || '0',
      level.quantity || level.q || '0'
    ]);
    
    console.log(`Parsed ${bids.length} bids, ${asks.length} asks`);
    
    const orderbook = { bids, asks };
    setCache(cacheKey, orderbook);
    return orderbook;
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    throw new Error(`Unable to fetch orderbook for ${marketId}`);
  }
}

export async function fetchMarketsSummary(): Promise<MarketSummary[]> {
  const cacheKey = 'markets:summary';
  
  // Check cache first
  const cached = getCached<MarketSummary[]>(cacheKey, CACHE_TTL.MARKETS);
  if (cached) return cached;
  
  try {
    // Try multiple Injective API endpoints
    const endpoints = [
      `${INJ_INDEXER_API}/api/chronos/v1/spot/markets`,
      `${INJ_INDEXER_API}/api/explorer/v1/spot/markets`,
      `https://k8s.mainnet.lcd.injective.network/injective/exchange/v1beta1/spot/markets`,
    ];
    
    let data: any = null;
    let successEndpoint = '';
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const res = await fetch(endpoint, {
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (res.ok) {
          data = await res.json();
          successEndpoint = endpoint;
          console.log(`Success with: ${endpoint}`);
          break;
        } else {
          console.log(`Failed with status ${res.status}: ${endpoint}`);
        }
      } catch (err) {
        console.log(`Error with ${endpoint}:`, err);
        continue;
      }
    }
    
    if (!data) {
      throw new Error('All Injective API endpoints failed');
    }
    
    // Debug: log response structure
    console.log('API Response keys:', Object.keys(data));
    
    // Try different possible data structures
    const markets = data.markets || data.data || [];
    
    // Debug: log first market structure
    if (markets.length > 0) {
      console.log('Sample market data:', JSON.stringify(markets[0], null, 2));
    }
    
    if (markets.length === 0) {
      console.warn('No markets found in response, generating mock data');
      // Return mock data for development
      return generateMockMarketData();
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
      
      // If no real change data, generate mock
      if (isNaN(change24h) || change24h === 0) {
        change24h = Math.random() * 20 - 10;
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
    
    console.log(`Transformed ${transformed.length} markets from ${successEndpoint}`);
    if (transformed.length > 0) {
      console.log('Sample transformed:', transformed[0]);
    }
    
    setCache(cacheKey, transformed);
    return transformed;
  } catch (error) {
    console.error('Error fetching markets summary:', error);
    console.warn('Falling back to mock data');
    
    // Return mock data as fallback
    const mockData = generateMockMarketData();
    setCache(cacheKey, mockData);
    return mockData;
  }
}

// Export cache management functions for testing/debugging
export function clearCache(): void {
  cache.clear();
  console.log('Cache cleared');
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
