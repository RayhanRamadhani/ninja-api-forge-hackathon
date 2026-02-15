import { Orderbook } from '@/app/lib/injective';

export interface PressureResult {
  buyPressure: number;
  sellPressure: number;
}

export function calcSpread(orderbook: Orderbook): number {
  // Validate orderbook has bids and asks
  if (!orderbook.bids || orderbook.bids.length === 0) {
    throw new Error('No bids available in orderbook');
  }
  if (!orderbook.asks || orderbook.asks.length === 0) {
    throw new Error('No asks available in orderbook');
  }

  // Debug logging
  console.log('First bid:', orderbook.bids[0]);
  console.log('First ask:', orderbook.asks[0]);

  const bestBidPrice = orderbook.bids[0][0];
  const bestAskPrice = orderbook.asks[0][0];
  
  const bestBid = parseFloat(bestBidPrice);
  const bestAsk = parseFloat(bestAskPrice);
  
  // Debug parsed values
  console.log(`Parsed bestBid: ${bestBid}, bestAsk: ${bestAsk}`);
  
  // Validate parsed values
  if (isNaN(bestBid) || isNaN(bestAsk) || bestAsk === 0) {
    throw new Error(`Invalid bid or ask prices - bestBid: "${bestBidPrice}" (${bestBid}), bestAsk: "${bestAskPrice}" (${bestAsk})`);
  }
  
  return ((bestAsk - bestBid) / bestAsk) * 100;
}

export function calcPressure(orderbook: Orderbook): PressureResult {
  // Validate orderbook
  if (!orderbook.bids || !orderbook.asks) {
    throw new Error('Invalid orderbook structure');
  }

  const totalBid = orderbook.bids.reduce((sum: number, order: [string, string]) => {
    const quantity = parseFloat(order[1]);
    return sum + (isNaN(quantity) ? 0 : quantity);
  }, 0);
  
  const totalAsk = orderbook.asks.reduce((sum: number, order: [string, string]) => {
    const quantity = parseFloat(order[1]);
    return sum + (isNaN(quantity) ? 0 : quantity);
  }, 0);
  
  const total = totalBid + totalAsk;
  
  // Handle case where there's no volume
  if (total === 0) {
    return {
      buyPressure: 50,
      sellPressure: 50
    };
  }
  
  return {
    buyPressure: (totalBid / total) * 100,
    sellPressure: (totalAsk / total) * 100
  };
}
