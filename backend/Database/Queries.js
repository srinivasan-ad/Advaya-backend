
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
  async Register(uuid , leader, college, email, phone, backup_email, backup_phone, team_name, theme_name, member1, member2, member3) {
    const client = await db.getClient();
    if (!client) {
        console.log(chalk.red("No DB client available."));
        return { success: false, message: "Database unavailable" };
    }

    try {
        await client.query("BEGIN");
        const themeRes = await client.query(
            "SELECT id FROM themes WHERE name = $1",
            [theme_name]
        );

        if (themeRes.rowCount === 0) {
            return { success: false, message: "Invalid theme selected" };
        }

        const theme_id = themeRes.rows[0].id;

        const teamRes = await client.query(
            `INSERT INTO teams (uuid ,leader, college, email, phone, backup_email, backup_phone, team_name, theme_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8 , $9) RETURNING id`,
            [uuid , leader, college, email, phone, backup_email, backup_phone, team_name, theme_id]
        );

        const teamId = teamRes.rows[0].id;
        const members = [member1, member2, member3];

        for (const member of members) {
            if (member && member.trim() !== "") {
                await client.query(
                    "INSERT INTO members (team_id, name) VALUES ($1, $2)",
                    [teamId, member]
                );
            }
        }

        await client.query("COMMIT");
        return { success: true, message: "Team registered successfully" };
    } catch (e) {
        await client.query("ROLLBACK");

        if (e.detail?.includes("Key (email)")) {
            return { success: false, message: "This email is already registered" };
        } else if (e.detail?.includes("Key (phone)")) {
            return { success: false, message: "This phone number is already registered" };
        }
        else if (e.detail?.includes("Key (team_name)")) {
          return { success: false, message: "This team_name is already registered" };
      }
        console.log(chalk.red("Error in Register:"), e);
        return { success: false, message: "Registration failed due to incomplete data" };
    } finally {
        client.release();
        console.log(chalk.yellowBright("Client released"));
    }
}
async AddComment(user_id, user_name, content) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");

      const result = await client.query(
          `INSERT INTO comments (user_id, user_name, content) 
           VALUES ($1, $2, $3) RETURNING id, created_at`,
          [user_id, user_name, content]
      );

      await client.query("COMMIT");

      return {
          success: true,
          message: "Comment added successfully",
          comment: result.rows[0]
      };

  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in AddComment:"), e);
      return { success: false, message: "Failed to add comment" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}
async AddSubComment(comment_id, user_id, user_name, content) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");
      const commentCheck = await client.query(
          "SELECT id FROM comments WHERE id = $1",
          [comment_id]
      );

      if (commentCheck.rowCount === 0) {
          return { success: false, message: "Parent comment does not exist" };
      }

      const result = await client.query(
          `INSERT INTO subcomments (comment_id, user_id, user_name, content) 
           VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
          [comment_id, user_id, user_name, content]
      );

      await client.query("COMMIT");

      return {
          success: true,
          message: "Reply added successfully",
          subcomment: result.rows[0]
      };

  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in AddSubComment:"), e);
      return { success: false, message: "Failed to add reply" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}
async GetAllComments() {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");
      const queryText = "SELECT * FROM comments ORDER BY created_at DESC";
      const result = await client.query(queryText);
      await client.query("COMMIT");

      return { success: true, comments: result.rows };
  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in GetAllComments:"), e);
      return { success: false, message: "Failed to fetch comments" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}
async GetSubcommentsByCommentId(comment_id) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");
      const queryText = "SELECT * FROM subcomments WHERE comment_id = $1 ORDER BY created_at ASC";
      const result = await client.query(queryText, [comment_id]);
      await client.query("COMMIT");

      return { success: true, subcomments: result.rows };
  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in GetSubcommentsByCommentId:"), e);
      return { success: false, message: "Failed to fetch subcomments" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}

async LikeComment(user_id, comment_id) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");

      const checkQuery = `SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2`;
      const checkRes = await client.query(checkQuery, [user_id, comment_id]);

      if (checkRes.rowCount > 0) {
          await client.query("ROLLBACK");
          return { success: false, message: "You have already liked this comment" };
      }
      await client.query(
          `INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)`,
          [user_id, comment_id]
      );
      await client.query(
          `UPDATE comments SET like_count = like_count + 1 WHERE id = $1`,
          [comment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Comment liked successfully" };
  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in LikeComment:"), e);
      return { success: false, message: "Failed to like comment" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}


async DislikeComment(user_id, comment_id) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM comment_dislikes WHERE user_id = $1 AND comment_id = $2`;
      const checkRes = await client.query(checkQuery, [user_id, comment_id]);

      if (checkRes.rowCount > 0) {
          await client.query("ROLLBACK");
          return { success: false, message: "You have already disliked this comment" };
      }
      await client.query(
          `INSERT INTO comment_dislikes (user_id, comment_id) VALUES ($1, $2)`,
          [user_id, comment_id]
      );
      await client.query(
          `UPDATE comments SET dislike_count = dislike_count + 1 WHERE id = $1`,
          [comment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Comment disliked successfully" };
  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in DislikeComment:"), e);
      return { success: false, message: "Failed to dislike comment" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}

async LikeSubcomment(user_id, subcomment_id) {
  const client = await db.getClient();
  if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
  }

  try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2`;
      const checkRes = await client.query(checkQuery, [user_id, subcomment_id]);

      if (checkRes.rowCount > 0) {
          await client.query("ROLLBACK");
          return { success: false, message: "You have already liked this subcomment" };
      }
      await client.query(
          `INSERT INTO subcomment_likes (user_id, subcomment_id) VALUES ($1, $2)`,
          [user_id, subcomment_id]
      );
      await client.query(
          `UPDATE subcomments SET like_count = like_count + 1 WHERE id = $1`,
          [subcomment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Subcomment liked successfully" };
  } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in LikeSubcomment:"), e);
      return { success: false, message: "Failed to like subcomment" };
  } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
  }
}

  
}
module.exports = Queries;
