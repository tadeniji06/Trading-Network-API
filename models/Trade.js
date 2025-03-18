const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coinId: {
    type: String,
    required: [true, 'Please provide the coin ID']
  },
  coinSymbol: {
    type: String,
    required: [true, 'Please provide the coin symbol']
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: [true, 'Please specify trade type']
  },
  quantity: {
    type: Number,
    required: [true, 'Please specify quantity']
  },
  price: {
    type: Number,
    required: [true, 'Please specify price']
  },
  total: {
    type: Number,
    required: [true, 'Please specify total amount']
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed'],
    default: 'completed'
  },
  orderType: {
    type: String,
    enum: ['market', 'limit', 'stop'],
    default: 'market'
  },
  limitPrice: {
    type: Number
  },
  stopPrice: {
    type: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Trade', TradeSchema);
