import WebSocket from 'ws';
import binance_wallex_common_symbols from '../../common_symbols';

interface BookTicker {
  u: number;          // order book updateId
  s: string;          // symbol
  b: string;          // best bid price
  B: string;          // best bid qty
  a: string;          // best ask price
  A: string;          // best ask qty
}

interface PriceData {
  [symbol: string]: {
    ask: [string, string];  // [price, qty]
    bid: [string, string];  // [price, qty]
  };
}

class BinanceServer {
  private ws: WebSocket | null = null;
  private priceCache: PriceData = {};
  private readonly wsUrl = 'wss://data-stream.binance.vision/ws';
  private requestId = 1;
  private isConnected = false;

  constructor() {
    this.initializePriceCache();
  }

  /**
   * Initialize price cache with all symbols
   */
  private initializePriceCache(): void {
    const symbols = binance_wallex_common_symbols.symbols.binance_symbol;
    symbols.forEach(symbol => {
      this.priceCache[symbol] = {
        ask: ['0', '0'],
        bid: ['0', '0']
      };
    });
    console.log(`✓ Cache initialized for ${symbols.length} symbols`);
  }

  /**
   * Connect to Binance WebSocket and subscribe to bookTicker streams
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          console.log('✓ Connected to Binance WebSocket');
          this.isConnected = true;
          this.subscribe();
          resolve();
        });

        this.ws.on('message', (data: string) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          console.error('WebSocket error:', error.message);
          this.isConnected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('WebSocket closed');
          this.isConnected = false;
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to all bookTicker streams for common symbols
   */
  private subscribe(): void {
    const symbols = binance_wallex_common_symbols.symbols.binance_symbol;
    const params = symbols.map(symbol => `${symbol.toLowerCase()}@bookTicker`);

    const subscriptionMessage = {
      method: 'SUBSCRIBE',
      params: params,
      id: this.requestId++
    };

    console.log(`📡 Subscribing to ${params.length} streams...`);
    this.ws?.send(JSON.stringify(subscriptionMessage));
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      // Ignore subscription confirmation messages
      if (message.result === null && message.id) {
        console.log(`✓ Subscription confirmed (ID: ${message.id})`);
        return;
      }

      // Handle bookTicker data
      if (message.s && message.b !== undefined && message.a !== undefined) {
        const bookTicker: BookTicker = message;
        this.updatePriceCache(bookTicker);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Update price cache with latest bookTicker data
   */
  private updatePriceCache(data: BookTicker): void {
    this.priceCache[data.s] = {
      ask: [data.a, data.A],
      bid: [data.b, data.B]
    };
  }

  /**
   * Get current price data for a specific symbol
   */
  public getPrice(symbol: string): {
    ask: [string, string];
    bid: [string, string];
  } | null {
    return this.priceCache[symbol] || null;
  }

  /**
   * Get all current prices
   */
  public getAllPrices(): PriceData {
    return { ...this.priceCache };
  }

  /**
   * Get prices for specific symbols
   */
  public getPricesBySymbols(symbols: string[]): PriceData {
    const result: PriceData = {};
    symbols.forEach(symbol => {
      if (this.priceCache[symbol]) {
        result[symbol] = this.priceCache[symbol];
      }
    });
    return result;
  }

  /**
   * Check if connected to WebSocket
   */
  public isConnectedToWs(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from WebSocket
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
      console.log('✓ Disconnected from Binance WebSocket');
    }
  }
}

export default new BinanceServer();
