const socketIo = require('socket.io');

let io;

exports.initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });
  
  io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Join user-specific room
    socket.on('join-user', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });
    
    // Join coin price updates room
    socket.on('watch-coin', (coinId) => {
      socket.join(`coin:${coinId}`);
      console.log(`Client watching coin: ${coinId}`);
    });
    
    // Leave coin price updates room
    socket.on('unwatch-coin', (coinId) => {
      socket.leave(`coin:${coinId}`);
      console.log(`Client stopped watching coin: ${coinId}`);
    });
    
    // Handle trade execution
    socket.on('execute-trade', async (tradeData) => {
      try {
        // This would call your trade controller
        // For now, just echo back the data
        socket.emit('trade-result', {
          success: true,
          message: 'Trade received (not actually executed via socket)',
          data: tradeData
        });
      } catch (error) {
        socket.emit('trade-result', {
          success: false,
          message: error.message
        });
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
  
  return io;
};

exports.emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

exports.emitToCoin = (coinId, event, data) => {
  if (io) {
    io.to(`coin:${coinId}`).emit(event, data);
  }
};

exports.emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

exports.getIO = () => {
  return io;
};
