
const chalk = require("chalk");
const db = require("./connection");
 class Queries {
  async Ping() {
    const client = await db.getClient();
    if (client) {
      try {
        await client.query("BEGIN");

        const queryText = "SELECT value FROM ping"; 
        const res = await client.query(queryText);

        await client.query("COMMIT");

        if (res.rows.length > 0) {
          return res.rows[0].value; 
        } else {
          console.log(chalk.yellow("No data found in ping table."));
          return null;
        }
      } catch (e) {
        await client.query("ROLLBACK");
        console.log(chalk.red("Error in Ping Query:"), e);
        throw e;
      } finally {
        client.release();
        console.log(chalk.yellowBright("Client released"));
      }
    } else {
      console.log(chalk.red("No DB client available."));
      return null;
    }
  }
  async Register(leader, college, email, phone, backup_email, backup_phone, member1, member2, member3) {
    const client = await db.getClient();
    if (client) {
      try {
        await client.query("BEGIN");
        const teamRes = await client.query(
          `INSERT INTO teams (leader, college, email, phone, backup_email, backup_phone)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [leader, college, email, phone, backup_email, backup_phone]
        );
  
        const teamId = teamRes.rows[0].id;
        const members = [member1, member2, member3];
  
        for (const member of members) {
          if (member && member.trim() !== "") {
            await client.query("INSERT INTO members (team_id, name) VALUES ($1, $2)", [teamId, member]);
          }
        }
  
        await client.query("COMMIT");
        return { success: true, message: "Team registered successfully" };
      } catch (e) {
        await client.query("ROLLBACK");
  
        if (e.detail && e.detail.includes("Key (email)")) {
          return { success: false, message: "This email is already registered" };
        } else if (e.detail && e.detail.includes("Key (phone)")) {
          return { success: false, message: "This phone number is already registered" };
        }
  
        console.log(chalk.red("Error in Register:"), e);
        return { success: false, message: "Registration failed due to incomplete Data" };
      } finally {
        client.release();
        console.log(chalk.yellowBright("Client released"));
      }
    } else {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  }
  
}
module.exports = Queries;
