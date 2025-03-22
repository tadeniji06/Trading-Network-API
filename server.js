require("dotenv").config();

const express = require("express");
const http = require("http"); // Add this line
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
// const rateLimit = require("express-rate-limit");
const connectDB = require("./config/database");
const socketService = require("./services/socketService"); // Add this line
const {
  startOrderProcessing,
} = require("./services/orderProcessingService");
const {
  startStrategyProcessing,
} = require("./services/strategyProcessingService");
const priceUpdateService = require("./services/priceUpdateService");
const passport = require("./config/passport");
const session = require("express-session");

// Configuration constants
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize Express app
const app = express();
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());
const server = http.createServer(app); // Create HTTP server
const io = socketService.initializeSocket(server); // Initialize Socket.IO

// Security and utility middleware
app.use(helmet()); // Security headers
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// CORS configuration
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logging middleware
app.use(morgan(NODE_ENV === "development" ? "dev" : "combined"));

// Rate limiting middleware
// Rate limiting middleware
// const apiLimiter = rateLimit({
//   windowMs: 120 * 60 * 1000, // 1 hour (increased from 15 minutes)
//   max: 100000, // limit each IP to 10000 requests per windowMs (increased from 600)
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { error: "Too many requests, please try again later." },
// });
// app.use("/api", apiLimiter);


// Connect to database
connectDB();

// API Routes
app.get("/", (req, res) => {
  res.json({
    message: "🔥 Social Trading API is live!",
    version: "1.0.0",
    documentation: "/api/docs",
  });
});

// Import and use route modules
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/trade", require("./routes/tradeRoutes"));
app.use("/api/social", require("./routes/socialRoutes"));
app.use("/api/leaderboard", require("./routes/leaderboardRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/strategies", require("./routes/strategyRoutes"));
app.use("/api/docs", require("./routes/docRoutes"));

// Error handling middleware
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error:
      NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// Start the server with Socket.IO
server.listen(PORT, () => {
  // Use server.listen instead of app.listen
  console.log(
    `🚀 Server running in ${NODE_ENV} mode on http://localhost:${PORT}`
  );

  // Start services
  if (process.env.NODE_ENV !== "test") {
    startOrderProcessing();
    startStrategyProcessing();
    priceUpdateService.startPriceUpdates();
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});
