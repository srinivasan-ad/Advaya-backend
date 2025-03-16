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
  const { user_id, user_name, content , timestamp } = req.body;

  if (!user_id || !user_name || !content || !timestamp) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await queries.AddComment(user_id, user_name, content , timestamp);
    if (result.sucess) {
      return res.status(201).json(result.comment);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error(chalk.red("Error in comments:"), error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.post("/comments/:comment_id/subcomments", async (req, res) => {
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
    console.error(chalk.red("Error in comments replies:"), error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});
app.get("/comments/:user_id", async (req, res) => {
    const {offset}  = req.query
    const {user_id} = req.params
  try {
    const result = await queries.GetAllComments(offset,user_id);
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
app.get("/comments/:user_id/:comment_id/subcomments", async (req, res) => {
    const { user_id, comment_id } = req.params;
    const commentIdNumber = parseInt(comment_id, 10);
    if (isNaN(commentIdNumber)) {
      return res.status(400).json({ success: false, message: "Invalid comment ID" });
    }
  
    try {
      const result = await queries.GetSubcommentsByCommentId(commentIdNumber, user_id);
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (e) {
      console.error("Error in subcomments:", e);
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

app.delete("/comments/:comment_id", async (req, res) => {
    const { user_id } = req.body;
    const { comment_id } = req.params;
    
    if (!user_id || !comment_id) {
        return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
    }
    
    try {
        const result = await queries.DeleteComment(comment_id, user_id);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in comment_id", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
app.delete("/subcomments/:subcomment_id", async (req, res) => {
    const { user_id } = req.body;
    const { subcomment_id } = req.params;
    
    if (!user_id || !subcomment_id) {
        return res.status(400).json({ success: false, message: "User ID and Subcomment ID are required" });
    }
    
    try {
        const result = await queries.DeleteSubcomment(subcomment_id, user_id);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in subcomment_id", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
app.put("/comments/:comment_id", async (req, res) => {
    const { user_id, content } = req.body;
    const { comment_id } = req.params;
    
    if (!user_id || !comment_id || !content) {
        return res.status(400).json({ success: false, message: "User ID, Comment ID, and content are required" });
    }
    
    try {
        const result = await queries.UpdateComment(comment_id, user_id, content);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in comment_id", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
app.put("/subcomments/:subcomment_id", async (req, res) => {
    const { user_id, content } = req.body;
    const { subcomment_id } = req.params;
    
    if (!user_id || !subcomment_id || !content) {
        return res.status(400).json({ success: false, message: "User ID, Subcomment ID, and content are required" });
    }
    
    try {
        const result = await queries.UpdateSubcomment(subcomment_id, user_id, content);
        return res.status(result.success ? 200 : 400).json(result);
    } catch (e) {
        console.error("Error in subcomment_id", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
app.get("/comments/:id/likes-dislikes", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queries.GetCommentLikesDislikes(id);
        return res.json(result);
    } catch (error) {
        console.error("Error fetching comment likes and dislikes:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});
app.get("/subcomments/:id/likes-dislikes", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queries.GetSubcommentLikesDislikes(id);
        return res.json(result);
    } catch (error) {
        console.error("Error fetching subcomment likes and dislikes:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`Server started at http://localhost:${process.env.PORT}`);
});

// app.delete("/comments/:comment_id/like", async (req, res) => {
//     const { user_id } = req.body;
//     const { comment_id } = req.params;

//     if (!user_id || !comment_id) {
//         return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
//     }

//     try {
//         const result = await queries.RemoveLikeComment(user_id, comment_id);
//         return res.status(result.success ? 200 : 400).json(result);
//     } catch (e) {
//         console.error("Error in like", e);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// });

// app.delete("/comments/:comment_id/dislike", async (req, res) => {
//     const { user_id } = req.body;
//     const { comment_id } = req.params;

//     if (!user_id || !comment_id) {
//         return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
//     }

//     try {
//         const result = await queries.RemoveDislikeComment(user_id, comment_id);
//         return res.status(result.success ? 200 : 400).json(result);
//     } catch (e) {
//         console.error("Error in dislike", e);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// });
// app.delete("/subcomments/:subcomment_id/like", async (req,res) => {
//     const { user_id } = req.body;
//     const { subcomment_id } = req.params;

//     if (!user_id || !subcomment_id) {
//         return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
//     }

//     try {
//         const result = await queries.RemoveLikeSubComment(user_id, subcomment_id);
//         return res.status(result.success ? 200 : 400).json(result);
//     } catch (e) {
//         console.error("Error in like", e);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// })
// app.delete("/subcomments/:subcomment_id/dislike", async (req,res) => {
//     const { user_id } = req.body;
//     const { subcomment_id } = req.params;

//     if (!user_id || !subcomment_id) {
//         return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
//     }

//     try {
//         const result = await queries.RemoveDislikeSubComment(user_id, subcomment_id);
//         return res.status(result.success ? 200 : 400).json(result);
//     } catch (e) {
//         console.error("Error in like", e);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// })