const axios = require('axios');

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

// Get current price for a specific coin
exports.getCoinPrice = async (coinId) => {
  try {
    const response = await coinGeckoApi.get('/simple/price', {
      params: {
        ids: coinId,
        vs_currencies: 'usd'
      }
    });
    
    return response.data[coinId].usd;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get trending coins
exports.getTrendingCoins = async () => {
  try {
    const response = await coinGeckoApi.get('/search/trending');
    
    return response.data.coins;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get coin details
exports.getCoinDetails = async (coinId) => {
  try {
    const response = await coinGeckoApi.get(`/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Search for coins
exports.searchCoins = async (query) => {
  try {
    const response = await coinGeckoApi.get('/search', {
      params: { query }
    });
    
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};

// Get market data for multiple coins
exports.getMarketData = async (page = 1, perPage = 50) => {
  try {
    const response = await coinGeckoApi.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: perPage,
        page: page,
        sparkline: false
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
};
