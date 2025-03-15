const chalk = require("chalk");

function errorHandlers(pool ) {
  process.on("uncaughtException", (err) => {
    console.error(chalk.red("Uncaught Exception:", err.message));
  });
  
  process.on("unhandledRejection", (reason) => {
    console.error(chalk.red("Unhandled Promise Rejection:", reason));
  });

  process.on("SIGINT", async () => {
    console.log(chalk.yellow("Shutting down server..."));
    await pool.end();
    process.exit(0);
  });
}

module.exports = { errorHandlers };