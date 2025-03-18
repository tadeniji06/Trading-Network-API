const mongoose = require('mongoose');

const StrategySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a strategy name']
  },
  description: {
    type: String
  },
  coinId: {
    type: String,
    required: [true, 'Please provide a coin ID']
  },
  coinSymbol: {
    type: String,
    required: [true, 'Please provide a coin symbol']
  },
  type: {
    type: String,
    enum: ['buy', 'sell', 'both'],
    required: true
  },
  conditions: [{
    indicator: {
      type: String,
      enum: ['price', 'volume', 'market_cap', 'price_change_24h'],
      required: true
    },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '=='],
      required: true
    },
    value: {
      type: Number,
      required: true
    }
  }],
  actions: [{
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    }
  }],
  active: {
    type: Boolean,
    default: true
  },
  performance: {
    executedTrades: {
      type: Number,
      default: 0
    },
    successfulTrades: {
      type: Number,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Strategy', StrategySchema);
