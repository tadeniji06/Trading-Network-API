const coinGeckoService = require('./coinGeckoService');
const socketService = require('./socketService');

// Keep track of which coins are being watched
const watchedCoins = new Set();

// Add a coin to the watched list
exports.watchCoin = (coinId) => {
  watchedCoins.add(coinId);
};

// Remove a coin from the watched list
exports.unwatchCoin = (coinId) => {
  watchedCoins.delete(coinId);
};

// Fetch and broadcast price updates
const updatePrices = async () => {
  if (watchedCoins.size === 0) {
    return;
  }
  
  try {
    const coinIds = Array.from(watchedCoins);
    
    // Get prices for all watched coins
    for (const coinId of coinIds) {
      try {
        const price = await coinGeckoService.getCoinPrice(coinId);
        
        if (price) {
          // Broadcast price update to all clients watching this coin
          socketService.emitToCoin(coinId, 'price-update', {
            coinId,
            price,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error(`Error fetching price for ${coinId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error updating prices:', error);
  }
};

// Start the price update service
exports.startPriceUpdates = () => {
  // Update prices every 30 seconds
  setInterval(updatePrices, 30000);
  console.log('Price update service started');
};
