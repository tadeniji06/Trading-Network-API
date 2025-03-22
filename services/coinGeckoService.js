const axios = require('axios');
const NodeCache = require('node-cache');

// Create a cache with TTL (time to live) of 60 seconds
const cache = new NodeCache({ stdTTL: 60 });

// Base URL for CoinGecko API
const API_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.COINGECKO_API_KEY || 'CG-RHQBmYiQYJbyyaU2uuv8S7Ba';

// Create axios instance with common config
const coinGeckoApi = axios.create({
  baseURL: API_URL,
  headers: {
    'x-cg-api-key': API_KEY
  }
});

// Helper function for retrying requests
async function retryRequest(requestFn, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error) {
      if (error.response && error.response.status === 429 && retries < maxRetries - 1) {
        // Calculate exponential backoff time
        const backoffTime = Math.pow(2, retries) * 1000 + Math.random() * 1000;
        console.log(`Rate limited. Retrying after ${backoffTime}ms...`);
        
        // Wait for backoff time
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        retries++;
      } else {
        throw error;
      }
    }
  }
}

// Get current price for a specific coin
exports.getCoinPrice = async (coinId) => {
  const cacheKey = `coin_price_${coinId}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await retryRequest(() => 
      coinGeckoApi.get('/simple/price', {
        params: {
          ids: coinId,
          vs_currencies: 'usd'
        }
      })
    );
    
    const price = response.data[coinId].usd;
    // Cache the response
    cache.set(cacheKey, price);
    return price;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get trending coins
exports.getTrendingCoins = async () => {
  const cacheKey = 'trending_coins';
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await retryRequest(() => 
      coinGeckoApi.get('/search/trending')
    );
    
    // Cache the response
    cache.set(cacheKey, response.data.coins);
    return response.data.coins;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get coin details
exports.getCoinDetails = async (coinId) => {
  const cacheKey = `coin_details_${coinId}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await retryRequest(() => 
      coinGeckoApi.get(`/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false
        }
      })
    );
    
    // Cache the response
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Search for coins
exports.searchCoins = async (query) => {
  const cacheKey = `search_${query}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await retryRequest(() => 
      coinGeckoApi.get('/search', {
        params: { query }
      })
    );
    
    // Cache the response
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get market data for multiple coins
exports.getMarketData = async (page = 1, perPage = 50) => {
  const cacheKey = `market_data_${page}_${perPage}`;
  
  // Check cache first
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }
  
  try {
    const response = await retryRequest(() => 
      coinGeckoApi.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: perPage,
          page: page,
          sparkline: false
        }
      })
    );
    
    // Cache the response
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};
