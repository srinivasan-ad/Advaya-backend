const { Pool } = require("pg");
const chalk = require("chalk");
require('dotenv').config();
class Database {
  static instance = null;
  attempts = 0;
  maxAttempts = 5;
  delay = 2000;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL, 
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on("error", async (err) => {
      console.error(chalk.red("Database connection lost. Retrying..."));
      const client = await this.connect();
      if (!client) {
        console.error(chalk.red("Database reconnection failed:", err.message));
      } else {
        console.log(chalk.green("Database reconnected successfully!"));
        client.release();
        console.log(chalk.yellowBright("Client released"));
      }
    });
  }
   getPool() {
    return this.pool;
  }
  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect() {
    while (this.attempts < this.maxAttempts) {
      try {
        this.attempts++;
        const client = await this.pool.connect();
        console.log(chalk.green("Connected to Supabase PostgreSQL"));
        this.attempts = 0;
        return client;
      } catch (err) {
        console.log(
          chalk.grey(
            `Connection attempt ${this.attempts} failed: Retrying in ${
              this.delay / 1000
            } sec`
          )
        );
        await new Promise((resolve) => setTimeout(resolve, this.delay));
      }
    }
    this.attempts = 0;
    console.log(chalk.redBright("Max connection attempts reached. DB is offline!"));
    return null;
  }

  async getClient() {
    return this.connect();
  }
}

const db = Database.getInstance();
module.exports = db;
