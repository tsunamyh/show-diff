import binanceServer from '../component/exchanges/binanceServer';
import fs from 'fs';
import path from 'path';

interface PriceSnapshot {
  timestamp: string;
  prices: {
    [symbol: string]: {
      ask: [string, string];
      bid: [string, string];
    };
  };
}

class PriceSnapshotService {
  private snapshotInterval: NodeJS.Timeout | null = null;
  private snapshotsFile = path.join(process.cwd(), 'price_snapshots.json');
  private snapshots: PriceSnapshot[] = [];

  /**
   * Start taking price snapshots every 5 seconds
   */
  public startSnapshots(): void {
    console.log('📸 Starting price snapshots every 5 seconds...');
    
    this.snapshotInterval = setInterval(() => {
      this.takeSnapshot();
    }, 5000);
  }

  /**
   * Stop taking snapshots
   */
  public stopSnapshots(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
      this.snapshotInterval = null;
      console.log('✓ Snapshots stopped');
    }
  }

  /**
   * Take a snapshot of current prices
   */
  private takeSnapshot(): void {
    const prices = binanceServer.getAllPrices();
    
    const snapshot: PriceSnapshot = {
      timestamp: new Date().toISOString(),
      prices: prices
    };

    // Keep only the latest snapshot (replace previous one)
    this.snapshots = [snapshot];

    // Log the snapshot
    console.log(`📊 Snapshot at ${snapshot.timestamp} - ${Object.keys(prices).length} symbols`);
  }

  /**
   * Get all snapshots
   */
  public getSnapshots(): PriceSnapshot[] {
    return this.snapshots;
  }

  /**
   * Get latest snapshot
   */
  public getLatestSnapshot(): PriceSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  /**
   * Get price history for a specific symbol (only latest snapshot)
   */
  public getSymbolPrice(symbol: string): { timestamp: string; price: { ask: [string, string]; bid: [string, string] } } | null {
    const latest = this.getLatestSnapshot();
    if (!latest || !latest.prices[symbol]) {
      return null;
    }
    return {
      timestamp: latest.timestamp,
      price: latest.prices[symbol]
    };
  }

  /**
   * Save snapshots to file
   */
  public saveSnapshotsToFile(): void {
    try {
      fs.writeFileSync(
        this.snapshotsFile,
        JSON.stringify(this.snapshots, null, 2),
        'utf-8'
      );
      console.log(`✓ Saved ${this.snapshots.length} snapshots to ${this.snapshotsFile}`);
    } catch (error) {
      console.error('Error saving snapshots:', error);
    }
  }

  /**
   * Load snapshots from file
   */
  public loadSnapshotsFromFile(): void {
    try {
      if (fs.existsSync(this.snapshotsFile)) {
        const data = fs.readFileSync(this.snapshotsFile, 'utf-8');
        this.snapshots = JSON.parse(data);
        console.log(`✓ Loaded ${this.snapshots.length} snapshots from file`);
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  }

  /**
   * Clear all snapshots
   */
  public clearSnapshots(): void {
    this.snapshots = [];
    console.log('✓ Snapshots cleared');
  }
}

export default new PriceSnapshotService();
