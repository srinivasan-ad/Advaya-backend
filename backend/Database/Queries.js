const chalk = require("chalk");
const db = require("./connection");
const { saveToFile } = require("./helper");
const Helper = require("../Microservice/Microservice");
;

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
  
  async couponsValidation(couponCode){
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("DB connection failed"));
      return { success: false , message : "db is not connected", dbError: true };
    }
    try {
      await client.query("BEGIN");

      const queryText = "SELECT * FROM coupons where couponCode = $1;";
      const res = await client.query(queryText, [couponCode]);

      if (!(res.rowCount > 0)){
        return { success: false, message: "Invalid coupon code", dbError: false, amount: 2};
      }

      if (res.rows[0].availability <= 0){
        return { success: true, message: "coupon has expired",expired: true, dbError: false, amount: 2};
      }
     console.log(res.rows[0].availability)
    console.log(res.rows[0].id)
      await client.query("COMMIT");
      return { success: true, message: "coupon is valid !", expired: false, remainingCount: res.rows[0].availability
        , couponUsed: res.rows[0].id, dbError: false, amount : res.rows[0].amount};
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error applying coupon code"), e);
      throw e;
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  async updateCoupon(couponCode) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("DB connection failed"));
      return { success: false, message: "DB is not connected" };
    }
  
    try {
      await client.query("BEGIN");
      const queryText = "SELECT * FROM coupons where couponCode = $1;";
      const res = await client.query(queryText, [couponCode]);

      if (!(res.rowCount > 0)){
        return {success: false, message: "Invalid coupon code"};
      }

      if (res.rows[0].availability <= 0){
        return {success: false, message: "coupon has expired"};
      }
     console.log(res.rows[0].availability)
     console.log(res.rows[0].id)
      await client.query("COMMIT");
      const updateQuery = "UPDATE coupons SET availability = availability - 1 WHERE id = $1 AND availability > 0 RETURNING availability;";
      const updateRes = await client.query(updateQuery, [res.rows[0].id]);
  
      if (updateRes.rows.length === 0) {
        await client.query("ROLLBACK"); 
        return { success: false, message: "Coupon not available or does not exist" };
      }
  
      await client.query("COMMIT");
  
      return { 
        success: true, 
        message: "Coupon count successfully updated!", 
        couponUsed: couponId, 
        availability: updateRes.rows[0].availability 
      };
  
    } catch (e) {
      await client.query("ROLLBACK"); 
      console.error("Error updating coupon:", e);
      return { success: false, message: "Database error" };
  
    } finally {
      client.release();
    }
  }
  
  async Register(
    uuid,
    leader,
    college,
    email,
    phone,
    backup_email,
    backup_phone,
    team_name,
    theme_name,
    problemStatement,
    member1,
    member2,
    member3,
    utrId,
    url
  ) {
    const client = await db.getClient();
  
    if (!client) {
      console.log(chalk.red("DB connection failed for Register function."));
      saveToFile({
        uuid, leader, college, email, phone, backup_email, backup_phone,
        team_name, theme_name,problemStatement, member1, member2, member3, utrId, url
      });
      return { success: false, message: "DB connection failed, data saved locally", teamId: uuid };
    }
  
    try {
      await client.query("BEGIN");
  
      const themeRes = await client.query("SELECT id FROM themes WHERE name = $1", [theme_name]);
  
      if (themeRes.rows.length === 0) {
        throw new Error(`Theme '${theme_name}' not found`);
      }
  
      const theme_id = themeRes.rows[0].id;
  
      const teamRes = await client.query(
        `INSERT INTO teams (uuid, leader, college, email, phone, backup_email, backup_phone, 
                            team_name, theme_id, member1, member2, member3, utr_id, theme_name, problem_statement, url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15 , $16)
         RETURNING uuid;`,
        [
          uuid, leader, college, email, phone, backup_email, backup_phone,
          team_name, theme_id, member1, member2, member3, utrId, theme_name, problemStatement, url
        ]
      );
  
      await client.query("COMMIT");
  
      return { success: true, message: "Team registered successfully", teamId: teamRes.rows[0].uuid , utr_exists: false};
  
    } catch (e) {
      await client.query("ROLLBACK");
  
      console.log(chalk.red("Error in Register function:"), e.code , e.detail);
  
      if (e.code === "23505" && e.detail.includes("utr_id")) {
        console.log(chalk.yellow(`Duplicate UTR ID: ${utrId} - Registration rejected.`));
        return { success: false, message: "UTR ID already exists", utr_exists: true };
      }
  
      saveToFile({
        uuid, leader, college, email, phone, backup_email, backup_phone,
        team_name, theme_name, problemStatement,member1, member2, member3, utrId
      });
  
      return { success: false, message: "Error inserting into database, data saved locally", teamId: uuid };
  
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  
  

  async getTicket(teamId) {
    const client = await db.getClient();
    try {
      const result = await client.query(
        `SELECT 
        team_no AS "teamNo",
          leader AS "leaderName",
          college AS "collegeName",
          email,
          phone,
          team_name AS "teamName",
          theme_name AS "themeName",
          problem_statement AS "problemStatement",
          member1,
          member2,
          member3,
           backup_email AS "backupEmail",
            backup_phone AS "backupPhone",
          github_username AS "githubUsername",
          utr_id AS "utrNumber"
        FROM teams
        WHERE uuid = $1::varchar`,
        [teamId]
      );
      
    if (result.rows.length === 0) {
      return {
        success: false,
        ticket: null,
      };
    }

    const row = result.rows[0];

   
    return {
      success: true,
      ticket: row,
    };
  } catch (e) {
    console.error("Error in getTickettest:", e);
    return { success: false, message: "Error retrieving ticket" };
  } finally {
    client.release();
  }
}

  
  async AddComment(user_id, user_name, content, timestamp) {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO comments (user_id, user_name, content, created_at) 
             VALUES ($1, $2, $3, $4) RETURNING id, user_id, user_name, content, created_at, like_count, dislike_count`,
        [user_id, user_name, content, timestamp]
      );

      const commentId = result.rows[0].id;

      const finalResult = await client.query(
        `SELECT 
                c.id AS "commentId",
                c.user_id AS "userId", 
                c.user_name AS "userName", 
                c.content AS comment, 
                c.created_at AS timestamp,
                c.like_count AS "likeCount",
                c.dislike_count AS "dislikeCount",
               c.subcomments_count AS "subCommentsCount",
                EXISTS (SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $1) AS "haveLiked",
                EXISTS (SELECT 1 FROM comment_dislikes WHERE comment_id = c.id AND user_id = $1) AS "haveDisliked"
            FROM comments c
            WHERE c.id = $2`,
        [user_id, commentId]
      );

      await client.query("COMMIT");

      return {
        sucess: true,
        comment: finalResult.rows[0],
      };
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("Error in CreateComment:", e);
      return { success: false, message: "Error creating comment" };
    } finally {
      client.release();
    }
  }

  async AddSubComment(comment_id, user_id, user_name, content, timestamp) {
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
        await client.query("ROLLBACK");
        return { success: false, message: "Parent comment does not exist" };
      }
      const result = await client.query(
        `INSERT INTO subcomments (comment_id, user_id, user_name, content, created_at) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, comment_id, user_id, user_name, content, created_at, like_count, dislike_count;`,
        [comment_id, user_id, user_name, content, timestamp]
      );

      const subcommentId = result.rows[0].id;
      await client.query(
        `UPDATE comments SET subcomments_count = subcomments_count + 1 WHERE id = $1;`,
        [comment_id]
      );
      const finalResult = await client.query(
        `SELECT 
          s.comment_id AS commentId,
          s.id AS subcommentId,
              s.user_id AS userId, 
              s.user_name AS userName, 
              s.content AS comment, 
              s.created_at AS timestamp,
              s.like_count AS likeCount,
              s.dislike_count AS dislikeCount,
              EXISTS (SELECT 1 FROM subcomment_likes WHERE subcomment_id = s.id AND user_id = $1) AS haveLiked,
              EXISTS (SELECT 1 FROM subcomment_dislikes WHERE subcomment_id = s.id AND user_id = $1) AS haveDisliked,
                c.subcomments_count AS subCommentsCount
          FROM subcomments s
           JOIN comments c ON c.id = s.comment_id 
          WHERE s.id = $2`,
        [user_id, subcommentId]
      );

      await client.query("COMMIT");

      return {
        success: true,
        subcomment: finalResult.rows[0],
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

  async GetAllComments(offset,user_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  
    try {
      await client.query("BEGIN");
  
      const queryText = `
        SELECT 
          c.id AS "commentId",
          c.user_id AS "userId", 
          c.user_name  AS "userName", 
          c.content AS comment, 
          c.created_at AS timestamp,
          c.like_count AS "likeCount",
          c.dislike_count AS "dislikeCount",
          c.subcomments_count AS "subCommentsCount",  
          EXISTS (SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $2) AS "haveLiked",
          EXISTS (SELECT 1 FROM comment_dislikes WHERE comment_id = c.id AND user_id = $2) AS "haveDisliked"
        FROM comments c
        ORDER BY c.created_at DESC
        LIMIT 10 OFFSET $1
      `;
  
      const result = await client.query(queryText, [offset*10,user_id]);
  
      await client.query("COMMIT");
      return {
        success: true,
        comments: result.rows,
      };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in GetAllComments:"), e);
      return { success: false, message: "Failed to fetch comments" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  
  async GetSubcommentsByCommentId(comment_id, user_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  
    try {
      await client.query("BEGIN");
  
      const queryText = `
 SELECT 
    s.id AS "subcommentId",
    s.user_id AS "userId", 
    s.user_name AS "userName", 
    s.content AS comment,
    s.created_at AS timestamp,
    s.like_count AS "likeCount",
    s.dislike_count AS "dislikeCount",
    EXISTS (
        SELECT 1 FROM subcomment_likes sl 
        WHERE sl.subcomment_id = s.id 
        AND sl.user_id = $2::varchar
    ) AS "haveLiked",
    EXISTS (
        SELECT 1 FROM subcomment_dislikes sd 
        WHERE sd.subcomment_id = s.id 
        AND sd.user_id = $2::varchar
    ) AS "haveDisliked"
FROM subcomments s
WHERE s.comment_id = $1::integer
ORDER BY s.created_at ASC;

      `;
      
      const result = await client.query(queryText, [comment_id, user_id]);
  
      await client.query("COMMIT");
  
      return {
        success: true,
        subcomments: result.rows,
      };
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
        const tempRes = await this.RemoveLikeComment(user_id, comment_id);
        console.log(tempRes);
        return {
          success: true,
          message: "Like removed for the commentcomment :)",
        };
      }
      const checkDislikeQuery = `SELECT * FROM comment_dislikes WHERE user_id = $1 AND comment_id = $2`;
      const checkDislikeRes = await client.query(checkDislikeQuery, [
        user_id,
        comment_id,
      ]);
      if (checkDislikeRes.rowCount > 0) {
        const tempRes = await this.RemoveDislikeComment(user_id, comment_id);
        console.log(tempRes);
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
        const tempRes = await this.RemoveDislikeComment(user_id, comment_id);
        console.log(tempRes);
        return {
          success: true,
          message: "Dislike removed for the comment :)",
        };
      }
      const checkLikeQuery = `SELECT * FROM comment_likes WHERE user_id = $1 AND comment_id = $2`;
      const checkLikeRes = await client.query(checkLikeQuery, [
        user_id,
        comment_id,
      ]);
      if (checkLikeRes.rowCount > 0) {
        const tempRes = await this.RemoveLikeComment(user_id, comment_id);
        console.log(tempRes);
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
      const checkLikeQuery = `SELECT 1 FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2`;
      const checkLikeRes = await client.query(checkLikeQuery, [user_id, subcomment_id]);
  
      if (checkLikeRes.rowCount > 0) {
        await client.query(`DELETE FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2`, [user_id, subcomment_id]);
        await client.query(`UPDATE subcomments SET like_count = like_count - 1 WHERE id = $1 AND like_count > 0`, [subcomment_id]);
  
        await client.query("COMMIT");
        return { success: true, message: "Like removed from reply!" };
      }
      const checkDislikeQuery = `SELECT 1 FROM subcomment_dislikes WHERE user_id = $1 AND subcomment_id = $2`;
      const checkDislikeRes = await client.query(checkDislikeQuery, [user_id, subcomment_id]);
  
      if (checkDislikeRes.rowCount > 0) {
        await client.query(`DELETE FROM subcomment_dislikes WHERE user_id = $1 AND subcomment_id = $2`, [user_id, subcomment_id]);
        await client.query(`UPDATE subcomments SET dislike_count = dislike_count - 1 WHERE id = $1 AND dislike_count > 0`, [subcomment_id]);
      }

      await client.query(
        `INSERT INTO subcomment_likes (user_id, subcomment_id) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id, subcomment_id) DO NOTHING`,
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
  
  async DislikeSubcomment(user_id, subcomment_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  
    try {
      await client.query("BEGIN");
      const checkDislikeQuery = `SELECT 1 FROM subcomment_dislikes WHERE user_id = $1 AND subcomment_id = $2`;
      const checkDislikeRes = await client.query(checkDislikeQuery, [user_id, subcomment_id]);
  
      if (checkDislikeRes.rowCount > 0) {
        await client.query(`DELETE FROM subcomment_dislikes WHERE user_id = $1 AND subcomment_id = $2`, [user_id, subcomment_id]);
        await client.query(`UPDATE subcomments SET dislike_count = dislike_count - 1 WHERE id = $1 AND dislike_count > 0`, [subcomment_id]);
  
        await client.query("COMMIT");
        return { success: true, message: "Dislike removed from reply!" };
      }
      const checkLikeQuery = `SELECT 1 FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2`;
      const checkLikeRes = await client.query(checkLikeQuery, [user_id, subcomment_id]);
  
      if (checkLikeRes.rowCount > 0) {
        await client.query(`DELETE FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2`, [user_id, subcomment_id]);
        await client.query(`UPDATE subcomments SET like_count = like_count - 1 WHERE id = $1 AND like_count > 0`, [subcomment_id]);
      }
  
      await client.query(
        `INSERT INTO subcomment_dislikes (user_id, subcomment_id) 
         VALUES ($1, $2) 
         ON CONFLICT (user_id, subcomment_id) DO NOTHING`,
        [user_id, subcomment_id]
      );
  
      await client.query(
        `UPDATE subcomments SET dislike_count = dislike_count + 1 WHERE id = $1`,
        [subcomment_id]
      );
  
      await client.query("COMMIT");
      return { success: true, message: "Subcomment disliked successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in DislikeSubcomment:"), e);
      return { success: false, message: "Failed to dislike subcomment" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  

  async RemoveLikeComment(user_id, comment_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const deleteQuery = `DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2 RETURNING *`;
      const deleteRes = await client.query(deleteQuery, [user_id, comment_id]);

      if (deleteRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return { success: false, message: "You have not liked this comment" };
      }
      await client.query(
        `UPDATE comments SET like_count = like_count - 1 WHERE id = $1`,
        [comment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Like removed successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in RemoveLikeComment:"), e);
      return { success: false, message: "Failed to remove like" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }

  async RemoveLikeSubComment(user_id, subcomment_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const deleteQuery = `DELETE FROM subcomment_likes WHERE user_id = $1 AND subcomment_id = $2 RETURNING *`;
      const deleteRes = await client.query(deleteQuery, [
        user_id,
        subcomment_id,
      ]);

      if (deleteRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return { success: false, message: "You have not liked this comment" };
      }
      await client.query(
        `UPDATE subcomments SET like_count = like_count - 1 WHERE id = $1`,
        [subcomment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Like removed successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in RemoveLikeComment:"), e);
      return { success: false, message: "Failed to remove like" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  async RemoveDislikeComment(user_id, comment_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const deleteQuery = `DELETE FROM comment_dislikes WHERE user_id = $1 AND comment_id = $2 RETURNING *`;
      const deleteRes = await client.query(deleteQuery, [user_id, comment_id]);

      if (deleteRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "You have not disliked this comment",
        };
      }
      await client.query(
        `UPDATE comments SET dislike_count = dislike_count - 1 WHERE id = $1`,
        [comment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Dislike removed successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in RemoveDislikeComment:"), e);
      return { success: false, message: "Failed to remove dislike" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }

  async RemoveDislikeSubComment(user_id, subcomment_id) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const deleteQuery = `DELETE FROM subcomment_dislikes WHERE user_id = $1 AND subcomment_id = $2 RETURNING *`;
      const deleteRes = await client.query(deleteQuery, [
        user_id,
        subcomment_id,
      ]);

      if (deleteRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "You have not disliked this subcomment",
        };
      }
      await client.query(
        `UPDATE subcomments SET dislike_count = dislike_count - 1 WHERE id = $1`,
        [subcomment_id]
      );

      await client.query("COMMIT");
      return { success: true, message: "Dislike removed successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in RemoveDislikeComment:"), e);
      return { success: false, message: "Failed to remove dislike" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  async DeleteSubcomment(subcomment_id, user_id, isAdmin = false) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");

      const checkQuery = `SELECT * FROM subcomments WHERE id = $1 AND (user_id = $2 OR $3::boolean)`;
      const checkRes = await client.query(checkQuery, [subcomment_id, user_id, isAdmin]);

      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return { success: false, message: "Subcomment not found " };
      }
      await client.query(
        `UPDATE comments SET subcomments_count = subcomments_count - 1 WHERE id = (SELECT comment_id FROM subcomments WHERE id = $1)
`,
        [subcomment_id]
      );
      await client.query(`DELETE FROM subcomments WHERE id = $1`, [
        subcomment_id,
      ]);

      await client.query("COMMIT");
      return { success: true, message: "Subcomment deleted successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in DeleteSubcomment:"), e);
      return { success: false, message: "Failed to delete subcomment" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }

  async DeleteComment(comment_id, user_id, isAdmin = false) {
    const client = await db.getClient();
    if (!client) {
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM comments WHERE id = $1 AND (user_id = $2 OR $3::boolean)`;
      const checkRes = await client.query(checkQuery, [comment_id, user_id, isAdmin]);

      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return { success: false, message: "Comment not found " };
      }
      await client.query(`DELETE FROM comments WHERE id = $1`, [comment_id]);

      await client.query("COMMIT");
      return { success: true, message: "Comment deleted successfully" };
    } catch (e) {
      await client.query("ROLLBACK");
      return { success: false, message: "Failed to delete comment" };
    } finally {
      client.release();
    }
  }

  async UpdateComment(comment_id, user_id, content) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  
    try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM comments WHERE id = $1 AND user_id = $2`;
      const checkRes = await client.query(checkQuery, [comment_id, user_id]);
  
      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "Comment not found or not authorized to update",
        };
      }

      await client.query(
        `UPDATE comments SET content = $1 WHERE id = $2`,
        [content,comment_id]
      );
      const finalResult = await client.query(
        `SELECT 
            c.id AS "commentId",
            c.user_id AS "userId", 
            c.user_name AS "userName", 
            c.content AS comment, 
            c.created_at AS timestamp,
            c.like_count AS "likeCount",
            c.dislike_count AS "dislikeCount",
            c.subcomments_count AS "subCommentsCount",  
            EXISTS (SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $1) AS "haveLiked",
            EXISTS (SELECT 1 FROM comment_dislikes WHERE comment_id = c.id AND user_id = $1) AS "haveDisliked"
            FROM comments c
            WHERE c.id = $2`,
        [user_id, comment_id]
      );
  
      await client.query("COMMIT");
  
      return {
        success: true,
        comment: finalResult.rows[0],
      };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in UpdateComment:"), e);
      return { success: false, message: "Failed to update comment" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  
  async UpdateSubcomment(subcomment_id, user_id, content) {
    const client = await db.getClient();
    if (!client) {
      console.log(chalk.red("No DB client available."));
      return { success: false, message: "Database unavailable" };
    }
  
    try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM subcomments WHERE id = $1 AND user_id = $2`;
      const checkRes = await client.query(checkQuery, [subcomment_id, user_id]);
  
      if (checkRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return {
          success: false,
          message: "Subcomment not found or not authorized to update",
        };
      }
  
      await client.query(
        `UPDATE subcomments SET content = $1 WHERE id = $2`,
        [content, subcomment_id]
      );
      const finalResult = await client.query(
        `SELECT 
            s.comment_id AS "commentId",
            s.id AS "subcommentId",
            s.user_id AS "userId", 
            s.user_name AS "userName", 
            s.content AS comment, 
            s.created_at AS timestamp,
            s.like_count AS "likeCount",
            s.dislike_count AS "dislikeCount",
            c.subcomments_count AS "subCommentsCount",  
            EXISTS (SELECT 1 FROM subcomment_likes WHERE subcomment_id = s.id AND user_id = $1) AS "haveLiked",
            EXISTS (SELECT 1 FROM subcomment_dislikes WHERE subcomment_id = s.id AND user_id = $1) AS "haveDisliked"
            FROM subcomments s
           JOIN comments c ON s.comment_id = c.id
           WHERE s.id = $2`,
        [user_id, subcomment_id]
      );
  
      await client.query("COMMIT");
  
      return {
        success: true,
        subcomment: finalResult.rows[0],
      };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in UpdateSubcomment:"), e);
      return { success: false, message: "Failed to update subcomment" };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }
  
  async GetCommentLikesDislikes(comment_id) {
    const client = await db.getClient();
    try {
      const queryText = `
          SELECT like_count, dislike_count 
          FROM comments 
          WHERE id = $1;
      `;
      const result = await client.query(queryText, [comment_id]);

      if (result.rowCount > 0) {
        return { success: true, data: result.rows[0] };
      } else {
        return { success: false, message: "Comment not found" };
      }
    } catch (e) {
      console.error(chalk.red("Error in GetCommentLikesDislikes:"), e);
      return {
        success: false,
        message: "Error fetching like and dislike count",
      };
    } finally {
      client.release();
    }
  }

  async GetSubcommentLikesDislikes(subcomment_id) {
    const client = await db.getClient();
    try {
      const queryText = `
          SELECT like_count, dislike_count 
          FROM subcomments 
          WHERE id = $1;
      `;
      const result = await client.query(queryText, [subcomment_id]);

      if (result.rowCount > 0) {
        return { success: true, data: result.rows[0] };
      } else {
        return { success: false, message: "Subcomment not found" };
      }
    } catch (e) {
      console.error(chalk.red("Error in GetSubcommentLikesDislikes:"), e);
      return {
        success: false,
        message: "Error fetching like and dislike count",
      };
    } finally {
      client.release();
    }
  }
  async UpdateTeamDetails(uuid, leader, teamName, email, phone_no, college, member1, member2, member3, utr, github_username, theme_name,  problemStatement , backupEmail,backupPhone) {
    const client = await db.getClient();
    try {
      const selectThemeQuery = "SELECT id FROM themes WHERE name = $1";
      const themeResult = await client.query(selectThemeQuery, [theme_name]);
  
      if (themeResult.rowCount === 0) {
        return { success: false, message: "Theme not found" };
      }
  
      const theme_id = themeResult.rows[0].id;
      const updateQuery = `
        UPDATE teams 
        SET 
          leader = $1,
          team_name = $2,
          phone = $3,
          college = $4,
          member1 = $5,
          member2 = $6,
          member3 = $7,
          utr_id = $8,
          github_username = $9,
          email = $10,
          theme_id = $11,
          theme_name = $12,
          problem_statement = $13,
          backup_email = $14,
          backup_phone = $15
        WHERE uuid = $16
        RETURNING id;
      `;
      const values = [
        leader,
        teamName,
        phone_no,
        college,
        member1,
        member2,
        member3,
        utr,
        github_username,
        email,
        theme_id,
        theme_name,
        problemStatement,
        backupEmail,
        backupPhone,
        uuid,
      ];
  
      const result = await client.query(updateQuery, values);
  
      if (result.rowCount > 0) {
        return { success: true, message: "Team updated successfully", data: result.rows[0] };
      } else {
        return { success: false, message: "No team found with that UTR ID" };
      }
    } catch (e) {
      console.error(chalk.red("Error in UpdateTeamDetails:"), e);
      return {
        success: false,
        message: "Error updating team details",
      };
    } finally {
      client.release();
    }
  }
  async getTickettest(teamId) {
    const client = await db.getClient();
    try {
        const result = await client.query(
          `SELECT 
            leader AS "leaderName",
            college AS "collegeName",
            email,
            phone,
            team_name AS "teamName",
            theme_name AS "themeName",
            problem_statement AS "problemStatement",
            member1,
            member2,
            member3,
            backup_email AS "backupEmail",
            backup_phone AS "backupPhone",
            github_username AS "githubUsername",
            utr_id AS "utrNumber"
          FROM test_teams
          WHERE uuid = $1::varchar`,
          [teamId]
        );
        
      if (result.rows.length === 0) {
        return {
          success: false,
          ticket: null,
        };
      }
  
      const row = result.rows[0];
  
     
      return {
        success: true,
        ticket: row,
      };
    } catch (e) {
      console.error("Error in getTickettest:", e);
      return { success: false, message: "Error retrieving ticket" };
    } finally {
      client.release();
    }
  }
  async registerUpdateEmail(email , leaderName, uuid)
  {
    const client = await db.getClient();
        try {
          const mailRes = await Helper.sendUpdateEmail( email , leaderName, uuid);
  
          if (mailRes) {
            await client.query(
              `UPDATE teams SET update_email = true WHERE uuid = $1`,
              [uuid]
            );
            console.log(` Email sent to ${email} (${leaderName}) and marked as updated.`);
            return { success: true, message: "Emails processed." };
          } else {
            console.log(`Failed to send email to ${email}`);
            return { success: false, message: "Failed to send email." };
          }
        } 
  catch (e) {
      console.error("Error in sendAllUpdateMails:", e);
      return { success: false, message: "Error while sending update emails" };
    } finally {
      client.release();
    }
  }
  
  async sendAllUpdateMails() {
    const client = await db.getClient();
  
    try {
      
      const result = await client.query(
        `SELECT uuid, leader AS "leaderName", email FROM teams WHERE update_email = false`
      );
  
      const rows = result.rows;
      console.log(rows)
      if (rows.length === 0) {
        console.log(" All teams already notified.");
        return { success: true, message: "No pending emails." };
      }
  
      for (const row of rows) {
        const { uuid, leaderName, email } = row;
  
        try {
          const mailRes = await Helper.sendUpdateEmail( email , leaderName, uuid);
  
          if (mailRes) {
            await client.query(
              `UPDATE test_teams SET update_email = true WHERE uuid = $1`,
              [uuid]
            );
            console.log(` Email sent to ${email} (${leaderName}) and marked as updated.`);
          } else {
            console.log(`Failed to send email to ${email}`);
          }
  
        } catch (mailErr) {
          console.error(`Error sending to ${email}:`, mailErr);
        }
      }
  
      return { success: true, message: "Emails processed." };
  
    } catch (e) {
      console.error("Error in sendAllUpdateMails:", e);
      return { success: false, message: "Error while sending update emails" };
    } finally {
      client.release();
    }
  }
  
  
  
}
module.exports = Queries;
