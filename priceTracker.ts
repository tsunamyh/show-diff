import binanceServer from './component/exchanges/binanceServer';
import priceSnapshotService from './services/priceSnapshotService';

async function main() {
  try {
    console.log('🚀 Starting Binance Price Tracker...\n');

    // Connect to Binance WebSocket
    await binanceServer.connect();

    // Wait a moment for initial data
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start taking price snapshots every 5 seconds
    priceSnapshotService.startSnapshots();

    // Run for 1 minute (for testing)
    // In production, this would run indefinitely
    console.log('\n✓ System running. Press Ctrl+C to stop.\n');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Shutting down gracefully...');
      
      priceSnapshotService.stopSnapshots();
      priceSnapshotService.saveSnapshotsToFile();
      
      binanceServer.disconnect();
      
      // Display summary
      const latestSnapshot = priceSnapshotService.getLatestSnapshot();
      if (latestSnapshot) {
        console.log(`\n📊 Latest snapshot: ${latestSnapshot.timestamp}`);
        console.log(`📈 Tracked ${Object.keys(latestSnapshot.prices).length} symbols`);
      }
      
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
