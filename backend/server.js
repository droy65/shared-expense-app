require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/db");

// Import all model associations
require("./src/models");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log("✅ MySQL Connected");

    // Sync all models
    await sequelize.sync({ alter: true });
    console.log("✅ Tables Synced");

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server Startup Error:");
    console.error(err);
  }
}

startServer();