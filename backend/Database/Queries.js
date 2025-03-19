const chalk = require("chalk");
const db = require("./connection");
const { saveToFile } = require("./helper");
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
      return { success: false , message : "db is not connected" };
    }
    try {
      await client.query("BEGIN");

      const queryText = "SELECT * FROM coupons where couponCode = $1;";
      const res = await client.query(queryText, [couponCode]);

      if (!(res.rowCount > 0)){
        return {success: false, message: "Invalid coupon code"};
      }

      if (res.rows[0].value <= 0){
        return {success: false, message: "coupon has expired"};
      }

      const updateQuery = "UPDATE coupons SET availability = availability - 1 WHERE couponCode = $1;";
      

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
    member1,
    member2,
    member3,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  ) {
    const client = await db.getClient();
 
    if (!client) {
      console.log(chalk.red("DB connection failed for Register function."));
        saveToFile({
        uuid, leader, college, email, phone, backup_email, backup_phone,
        team_name, theme_name, member1, member2, member3,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
      });
      return { success: true, message:  "Team registered successfully",teamId : uuid };
    }
if(client)
{

    try {
      await client.query("BEGIN");

      const themeRes = await client.query("SELECT id FROM themes WHERE name = $1", [theme_name]);



      const theme_id = themeRes.rows[0].id;

      const teamRes = await client.query(
        `INSERT INTO teams (uuid, leader, college, email, phone, backup_email, backup_phone, team_name, theme_id, member1, member2, member3, razorpay_order_id, razorpay_payment_id, razorpay_signature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING uuid`,
        [
          uuid, leader, college, email, phone, backup_email, backup_phone,
          team_name, theme_id, member1, member2, member3,
          razorpay_order_id, razorpay_payment_id, razorpay_signature
        ]
      );

      await client.query("COMMIT");
      return { success: true, message: "Team registered successfully", teamId: teamRes.rows[0].uuid };
    } catch (e) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in Register function:"), e);
      saveToFile({
        uuid, leader, college, email, phone, backup_email, backup_phone,
        team_name, theme_name, member1, member2, member3,
        razorpay_order_id, razorpay_payment_id, razorpay_signature
      });
      return { success: true, message:  "Team registered successfully",teamId  :uuid };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
    }
  }}

  async  Register2(
    uuid,
    leader,
    college,
    email,
    phone,
    backup_email,
    backup_phone,
    team_name,
    theme_name,
    member1,
    member2,
    member3,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  ) {
    const client = await db.getClient();
  
    if (!client) {
      console.log(chalk.red("DB connection failed for Register2 function."));
      return { success: false };
    }
  
    try {
      await client.query("BEGIN");
  
      const themeRes = await client.query(
        "SELECT id FROM themes WHERE name = $1",
        [theme_name]
      );
  
      if (!themeRes.rowCount) {
        await client.query("ROLLBACK");
        return { success: false };
      }
  
      const theme_id = themeRes.rows[0].id;
  
      await client.query(
        `INSERT INTO teams (uuid, leader, college, email, phone, backup_email, backup_phone, team_name, theme_id, member1, member2, member3, razorpay_order_id, razorpay_payment_id, razorpay_signature)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          uuid, leader, college, email, phone, backup_email, backup_phone,
          team_name, theme_id, member1, member2, member3,
          razorpay_order_id, razorpay_payment_id, razorpay_signature
        ]
      );
  
      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      console.log(chalk.red("Error in Register2 function:"), error);
      return { success: false };
    } finally {
      client.release();
      console.log(chalk.yellowBright("Client released"));
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
  async DeleteSubcomment(subcomment_id, user_id) {
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

  async DeleteComment(comment_id, user_id) {
    const client = await db.getClient();
    if (!client) {
      return { success: false, message: "Database unavailable" };
    }

    try {
      await client.query("BEGIN");
      const checkQuery = `SELECT * FROM comments WHERE id = $1 AND user_id = $2`;
      const checkRes = await client.query(checkQuery, [comment_id, user_id]);

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
}
module.exports = Queries;
