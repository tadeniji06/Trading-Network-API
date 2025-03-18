
// When a user connects
exports.onConnection = (socket, io) => {
 // Join user-specific room
 socket.on('join-user', (userId) => {
   socket.join(`user:${userId}`);
 });
 
 // Join coin price updates room
 socket.on('watch-coin', (coinId) => {
   socket.join(`coin:${coinId}`);
 });
 
 // Leave coin price updates room
 socket.on('unwatch-coin', (coinId) => {
   socket.leave(`coin:${coinId}`);
 });
 
 // Handle trade execution
 socket.on('execute-trade', async (tradeData) => {
   // Process trade and emit result
   // This would call your trade controller
 });
 
 // Handle disconnection
 socket.on('disconnect', () => {
   console.log('Client disconnected');
 });
};
