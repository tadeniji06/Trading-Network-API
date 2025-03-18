const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

module.exports = (app) => {
  // Set security headers
  app.use(helmet());
  
  // Enable CORS
  app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api', limiter);
  
  // Prevent NoSQL injection
  app.use(mongoSanitize());
  
  // Prevent HTTP param pollution
  app.use(hpp());
};
