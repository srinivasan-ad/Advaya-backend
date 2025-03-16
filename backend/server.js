const express = require("express");
const cors = require("cors");
const chalk = require("chalk");
const Middleware = require("./Middleware/middleware");
const { errorHandlers } = require("./ErrorHelpers/error");
const db = require("./Database/connection");
const Queries = require("./Database/Queries");
const Helper = require("./Microservice/Microservice");
const generateShortUUID = require("./Helper/helper");

require("dotenv").config();
const app = express();
const middleware = new Middleware();
const queries = new Queries();
const helper = new Helper();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: "https://00d3-106-222-203-37.ngrok-free.app",
  })
);
app.use((req, res, next) => {
  middleware.routeHit(req, res, next);
});
errorHandlers(db.getPool());
app.get("/", (req, res) => {
  return res.send("Hello champ !");
});
app.get("/ping", async (req, res) => {
  console.log(process.env.DATABASE_URL);
  const result = await queries.Ping();
  if (result) {
    return res.send(result);
  } else {
    return res.send("Database is offline :(");
  }
});
app.post("/register", async (req, res) => {
  const {
    leaderName,
    collegeName,
    email,
    phone,
    backupEmail,
    backupPhone,
    teamName,
    themeName,
    member1,
    member2,
    member3,
  } = req.body;
  try {
    const uuid = generateShortUUID();
    console.log(uuid);
    const result = await queries.Register(
      uuid,
      leaderName,
      collegeName,
      email,
      phone,
      backupEmail,
      backupPhone,
      teamName,
      themeName,
      member1,
      member2,
      member3
    );
    if (result.success) {
      await Helper.sendRegistrationEmail(
        email,
        leaderName,
        teamName,
        themeName
      );
      return res.status(200).json(result);
    } else {
      return res.json(result);
    }
  } catch (e) {
    console.error("Error in /register:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.post("/comments", async (req, res) => {
  const { user_id, user_name, content } = req.body;

  if (!user_id || !user_name || !content) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await queries.AddComment(user_id, user_name, content);
    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error(chalk.red("Error in /comments:"), error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.post("/comments/:comment_id/replies", async (req, res) => {
  const { comment_id } = req.params;
  const { user_id, user_name, content } = req.body;

  if (!comment_id || !user_id || !user_name || !content) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await queries.AddSubComment(
      comment_id,
      user_id,
      user_name,
      content
    );
    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error(chalk.red("Error in /comments/:comment_id/replies:"), error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.get("/comments", async (req, res) => {
  try {
    const result = await queries.GetAllComments();
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (e) {
    console.error("Error in comments:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.get("/comments/:comment_id/replies", async (req, res) => {
  const { comment_id } = req.params;

  if (!comment_id) {
    return res
      .status(400)
      .json({ success: false, message: "Comment ID is required" });
  }

  try {
    const result = await queries.GetSubcommentsByCommentId(comment_id);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (e) {
    console.error("Error in /comments/:comment_id/subcomments:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.post("/comments/:comment_id/like", async (req, res) => {
  const { user_id } = req.body;
  const { comment_id } = req.params;

  if (!user_id || !comment_id) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and Comment ID are required" });
  }

  try {
    const result = await queries.LikeComment(user_id, comment_id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in comments like:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.post("/comments/:comment_id/dislike", async (req, res) => {
  const { user_id } = req.body;
  const { comment_id } = req.params;

  if (!user_id || !comment_id) {
    return res
      .status(400)
      .json({ success: false, message: "User ID and Comment ID are required" });
  }

  try {
    const result = await queries.DislikeComment(user_id, comment_id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in comments dislike:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.post("/subcomments/:subcomment_id/like", async (req, res) => {
  const { user_id } = req.body;
  const { subcomment_id } = req.params;

  if (!user_id || !subcomment_id) {
    return res
      .status(400)
      .json({
        success: false,
        message: "User ID and Subcomment ID are required",
      });
  }

  try {
    const result = await queries.LikeSubcomment(user_id, subcomment_id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in subcomments like:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.post("/subcomments/:subcomment_id/dislike", async (req, res) => {
  const { user_id } = req.body;
  const { subcomment_id } = req.params;

  if (!user_id || !subcomment_id) {
    return res
      .status(400)
      .json({
        success: false,
        message: "User ID and Subcomment ID are required",
      });
  }

  try {
    const result = await queries.DislikeSubcomment(user_id, subcomment_id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in subcomments like:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

app.delete("/comments/:comment_id/like", async (req, res) => {
    const { user_id } = req.body;
    const { comment_id } = req.params;

    if (!user_id || !comment_id) {
        return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
    }

    try {
        const result = await queries.RemoveLikeComment(user_id, comment_id);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in /comments/:comment_id/like:", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.delete("/comments/:comment_id/dislike", async (req, res) => {
    const { user_id } = req.body;
    const { comment_id } = req.params;

    if (!user_id || !comment_id) {
        return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
    }

    try {
        const result = await queries.RemoveDislikeComment(user_id, comment_id);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in /comments/:comment_id/dislike:", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.listen(process.env.PORT, () => {
  console.log(`Server started at http://localhost:${process.env.PORT}`);
});
