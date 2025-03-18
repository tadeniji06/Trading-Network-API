const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.DB_URL;

    const conn = await mongoose.connect(MONGO_URI);

    console.log(`✅ MongoDB Connected`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
