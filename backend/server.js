const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fileUpload = require("express-fileupload");
require('./Database/retry')
require('./Microservice/retry_mail')
const chalk = require("chalk");
const Middleware = require("./Middleware/middleware");
const { errorHandlers } = require("./ErrorHelpers/error");
const db = require("./Database/connection");
const Queries = require("./Database/Queries");
const Helper = require("./Microservice/Microservice");
const path = require("path");
const Razorpay = require("razorpay");
const { validateWebhookSignature } = require("razorpay/dist/utils/razorpay-utils");
const { generateShortUUID } = require("./Database/helper");
const twilloWhatsapp = require("./Microservice/Whatsapp");
const { v4 } = require("uuid");
const cookieParser = require("cookie-parser")

require("dotenv").config();
const app = express();
const middleware = new Middleware();
const queries = new Queries();
const helper = new Helper();

const ADMIN_COMMENT_PASS = `Ld)2+Arcgz=Nh6ZDWaw$X&`;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ADMIN_PASS = `cat`;
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SECRET))
app.use("/qrcodes", express.static(path.join(__dirname, "Microservice/public/qrcodes")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);
app.use((_, res, next) => {
  res.setHeader("ngrok-skip-browser-warning", "true");
  next();
});
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

app.get("/validate/github/user/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const response = await fetch(`https://api.github.com/users/${username}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        },
      }
    );
    const resJson = await response.json();
    if (response.status === 200) {
      res.status(200).send({
        success: true,
        message: 'Username exists',
        githubData: resJson,
      });
    } else if (response.status === 403) {
      res.status(403).send({
        success: false,
        message: resJson.message,
        githubData: resJson,
      });
    } else {
      res.status(400).send({
        success: false,
        message: 'Username does not exists',
        githubData: resJson,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).send({
      success: false,
      message: 'Server error',
      error
    });
  }
})

app.put('/details/update', async (req, res) => {
  try {
    const { uuid } = req.query;

    if (!uuid) {
      return res.status(400).json({ success: false, message: 'UUID is required in query' });
    }

    console.log("Raw Body:", req.body);

    const {
      leaderName,
      collegeName,
      email,
      phone,
      teamName,
      themeName,
      problemStatement,
      member1,
      member2,
      member3,
      githubUsername,
      utrNumber,
      backupEmail,
      backupPhone
    } = req.body;

    const updateResult = await queries.UpdateTeamDetails(
      uuid,
      leaderName,
      teamName,
      email,
      phone,
      collegeName,
      member1,
      member2,
      member3,
      utrNumber,
      githubUsername,
      themeName,
      problemStatement,
      backupEmail,
      backupPhone
    );

    if (updateResult.success) {
      return res.status(200).json({
        success: true,
        message: 'Team details updated',
        data: updateResult.data
      });
    } else {
      return res.status(400).json(updateResult);
    }

  } catch (error) {
    console.error('Error in /details/update:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating team details'
    });
  }
});

app.post('/register', async (req, res) => {
  try {
    console.log("Raw Body:", req.body);
    const {
      leaderName,
      collegeName,
      email,
      phone,
      backupEmail,
      backupPhone,
      teamName,
      themeName,
      problemStatement,
      member1,
      member2,
      member3,
      utrNumber,
    } = req.body;

    if (!leaderName || !collegeName || !email || !phone || !teamName || !themeName || !utrNumber) {
      return res.status(400).json({ success: false, message: "Missing required form fields" });
    }

    if (!req.files || !req.files.paymentProof) {
      return res.status(400).json({ success: false, message: "No payment proof uploaded" });
    }

    const paymentProof = req.files.paymentProof;
    const uuid = generateShortUUID();
    const temp = paymentProof.name.split(".");
    const ext = temp[temp.length - 1];

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
      problemStatement,
      member1,
      member2,
      member3,
      utrNumber,
      `https://aserver.manojad.dev/uploads/${uuid}.${ext}`
    );

    if (result.success) {
      console.log("Registration Successful:", result);

      const uploadPath = path.join(__dirname, "uploads", `${uuid}.${ext}`);

      await new Promise((resolve, reject) => {
        paymentProof.mv(uploadPath, (err) => {
          if (err) {
            console.error("File Upload Error:", err);
            reject(err);
          } else {
            console.log("File saved at:", uploadPath);
            resolve();
          }
        });
      });
      const file = await twilloWhatsapp.generateQRFile(`https://advaya.bgscet.ac.in/ticket/${uuid}`, uuid);
      if (!file) {
        return res.status(400).json(result);
      }
      const mail_res = await Helper.sendRegistrationEmail(
        email,
        leaderName,
        teamName,
        themeName,
        problemStatement,
        member1,
        member2,
        member3,
        file.filePath,
        file.filename
      );
      console.log(mail_res)
      // const createMessage = await twilloWhatsapp.createMessage(
      //   phone,
      //   leaderName,
      //   teamName,
      //   member1,
      //   member2,
      //   member3,
      //   themeName,
      //   uuid
      // );

      // console.log("Message Sent Status:", createMessage);
      const update_mail_res = await queries.registerUpdateEmail(email, leaderName, uuid)
      console.log(update_mail_res);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.post('/bulkupdatemail', async (req, res) => {
  try {
    const result = await queries.sendAllUpdateMails();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

//sending noraml mail seperately api
app.post('/mail', async (req, res) => {
  console.log('Received Status Callback:', req.body);
  const file = await twilloWhatsapp.generateQRFile(`https://advaya.bgscet.ac.in/ticket/ef2c2b`, 'ef2c2b');
  if (!file) {
    return res.status(400).json(result);
  }
  const mail_res = await Helper.sendRegistrationEmail(
    "manojadkc2004@gmail.com",
    "Manoja",
    "Light Mode",
    "AI automation",
    "Solving Workload on employees",
    "Manoja",
    "Vilas",
    "Aditya",
    file.filePath,
    file.filename
  );
  console.log(mail_res)
  res.sendStatus(200);
});
//sending update mail seperately api 
app.post('/updatemail', async (req, res) => {
  console.log('Received Status Callback:', req.body);
  const mail_res = await Helper.sendUpdateEmail(
    mail,
    leaderName,
    uuid
  );
  console.log(mail_res)
  res.sendStatus(200);
});

app.post("/comment", async (req, res) => {
  const { user_id, user_name, content, timestamp } = req.body;

  if (!user_id || !user_name || !content || !timestamp) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await queries.AddComment(user_id, user_name, content, timestamp);
    if (result.sucess) {
      return res.status(201).json(result);
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
app.post("/comment/:comment_id/subcomment", async (req, res) => {
  const { comment_id } = req.params;
  const { user_id, user_name, content, timestamp } = req.body;

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
      content,
      timestamp
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
app.get("/comments", async (req, res) => {
  const { offset, user_id } = req.query
  try {
    const result = await queries.GetAllComments(offset, user_id);
    if (result.success) {
      console.log(result.comments)
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
app.get("/comment/subcomments", async (req, res) => {
  const { user_id, comment_id } = req.query;
  console.log(user_id, comment_id);
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

app.post("/comment/:comment_id/like", async (req, res) => {
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

app.post("/comment/:comment_id/dislike", async (req, res) => {
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
app.post("/subcomment/:subcomment_id/like", async (req, res) => {
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

app.post("/subcomment/:subcomment_id/dislike", async (req, res) => {
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

app.delete("/comment/:comment_id", async (req, res) => {
  const { user_id } = req.body;
  const { comment_id } = req.params;
  const password = req.header("admin-password");
  let isAdmin = false;
  if (password === ADMIN_COMMENT_PASS) {
    isAdmin = true;
  }
  if (!user_id || !comment_id) {
    return res.status(400).json({ success: false, message: "User ID and Comment ID are required" });
  }

  try {
    const result = await queries.DeleteComment(comment_id, user_id, isAdmin);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in comment_id", e);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.delete("/subcomment/:subcomment_id", async (req, res) => {
  const { user_id } = req.body;
  const { subcomment_id } = req.params;
  const password = req.header("admin-password");
  let isAdmin = false;
  if (password === ADMIN_COMMENT_PASS) {
    isAdmin = true;
  }
  if (!user_id || !subcomment_id) {
    return res.status(400).json({ success: false, message: "User ID and Subcomment ID are required" });
  }

  try {
    const result = await queries.DeleteSubcomment(subcomment_id, user_id, isAdmin);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (e) {
    console.error("Error in subcomment_id", e);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.put("/comment/:comment_id", async (req, res) => {
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
app.put("/subcomment/:subcomment_id", async (req, res) => {
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

// Payment
app.post("/payment/create-order", async (req, res) => {
  try {
    const { formData } = req.body;
    const result = await queries.couponsValidation(formData.couponCode)
    if (result.dbError === true) {
      res.status(200).send({
        success: false, message: "Database is offline",
      });
      return;
    }
    const paymentDetails = {
      amount: (result.amount || 2) * 100,
      currency: "INR",
      receipt: "receipt#1",
      notes: formData
    };
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await razorpay.orders.create(paymentDetails);
    return res.status(200).json({
      success: true, message: "Payment order successfully created",
      order: order
    });
  } catch (error) {
    console.error("Payment order Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});
app.post("/payment/verify-order", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature,
      formData
    } = req.body;
    console.log(formData)
    // console.log();
    const secret = razorpay.key_secret;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );
    if (isValidSignature) {
      verified = true
    }
    else {

      verified = false

    }
    const uuid = generateShortUUID();
    console.log(uuid);

    let result = await queries.Register(
      uuid,
      formData.leaderName,
      formData.collegeName,
      formData.email,
      formData.phone,
      formData.backupEmail,
      formData.backupPhone,
      formData.teamName,
      formData.themeName,
      formData.member1,
      formData.member2,
      formData.member3,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (result.success) {
      // const mail_res = await Helper.sendRegistrationEmail(
      //   formData.email,
      //   formData.leaderName,
      //   formData.teamName,
      //   formData.themeName,
      //   formData.member1,
      //   formData.member2,
      //   formData.member3
      // );
      // console.log(mail_res)
      // const createMessage = await twilloWhatsapp.createMessage(
      //   formData.phone,
      //   formData.leaderName,
      //   formData.teamName,
      //   formData.member1,
      //   formData.member2,
      //   formData.member3,
      //   formData.themeName,
      //   uuid
      // );

      // console.log("Message Sent Status:", createMessage);
      result.verified = true
      console.log(result)
      return res.status(200).json(result);
    } else {
      return res.json(result);
    }
  } catch (error) {
    console.error("Payment verification Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ticket
app.get("/ticket/:ticketid", async (req, res) => {
  try {
    const tickerId = req.params.ticketid;
    const resDb = await queries.getTicket(tickerId);
    res.status(200).send(resDb);
  } catch (error) {
    console.error("Payment verification Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
})
app.get("/test/:ticketid", async (req, res) => {
  try {
    const tickerId = req.params.ticketid;
    const resDb = await queries.getTickettest(tickerId);
    res.status(200).send(resDb);
  } catch (error) {
    console.error("Payment verification Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
})

app.post("/admin/login", (req, res) => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PASS) {
      res.status(200).send({
        success: true,
        message: "Password is correct. You can use all admin APIs."
      });
    } else {
      res.status(200).send({
        success: false,
        message: "Password is incorrect"
      });
    }
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
});

const GITHUB_ORG = "AdvayaHackathon";

async function createRepo(repoName) {
  try {
    console.log(GITHUB_TOKEN);
    const res = await axios.post(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos`,
      {
        name: repoName,
        private: true
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );
    console.log(`✅ Repo '${repoName}' created successfully.`);
    return res.data;
  } catch (error) {
    console.error("❌ Error creating repo:", error.response?.data || error.message);
    return null;
  }
}

async function addCollaborator(collabUser, repoName) {
  try {
    const res = await axios.put(
      `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/collaborators/${collabUser}`,
      {
        permission: "admin"
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );
    console.log(`✅ Collaborator '${collabUser}' added with admin access.`);
    return res.data;
  } catch (error) {
    console.error("❌ Error adding collaborator:", error.response?.data || error.message);
    return null;
  }
}

async function createReadme(userName, repoName) {
  const content = `# Welcome ${userName}\n\nWelcome ${userName}, ${userName}.\n`;
  const encodedContent = Buffer.from(content).toString("base64");

  try {
    const res = await axios.put(
      `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/contents/README.md`,
      {
        message: "Init commit by Advaya Org. Start Hacking 😀🚀.",
        content: encodedContent
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );
    console.log("✅ README.md added successfully.");
    return res.data;
  } catch (error) {
    console.error("❌ Error creating README.md:", error.response?.data || error.message);
    return null;
  }
}

async function checkIfReadmeExists(repoName) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/contents/README.md`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json"
        }
      }
    );
    console.log("✅ README.md exists at:", res.data.path);
    return true;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      console.log("❌ README.md does not exist.");
    }
    return false;
  }
}

async function checkIfRepoExists(repoName) {
  try {
    const res = await axios.get(`https://api.github.com/repos/${GITHUB_ORG}/${repoName}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });
    console.log("✅ Repo exists:", res.data["full_name"]);
    return true;
  } catch (err) {
    console.error("⚠️ Error checking repo:", err.message);
    if (err.response && err.response.status === 404) {
      console.log("❌ Repo does not exist.");
    }
    return false;
  }
}

async function githubCICD(teamId) {
  try {
    const resTeam = await queries.getTicket(teamId);
    if (resTeam.success === false || !resTeam.ticket) {
      return null;
    }
    const teamDetails = resTeam.ticket;
    // console.log(teamDetails);
    const properTeamName = teamDetails["teamName"].normalize("NFKD")
      .replace(/[^\w\-\.]/g, "_")
      .replace(/[\u{0080}-\u{FFFF}]/gu, "_")
      .replace(/^\.+/, "")
      .replace(/ /g, "_")
      .substring(0, 95)
      .toLowerCase();
    const repoName = `${teamDetails["teamNo"]}-${properTeamName}`;
    const resExist = await checkIfRepoExists(repoName);
    const cicd = {
      repoExist: false,
      repoCollab: false,
      repoReadMe: false,
    };
    // Crate a new repo if repo does not exists
    if (resExist !== true) {
      const resCreate = await createRepo(repoName);
      if (resCreate === null) {
        return cicd;
      }
    }
    cicd.repoExist = true;
    const collabUser = teamDetails["githubUsername"];
    // Add a admin collab
    const resCollab = await addCollaborator(collabUser, repoName);
    if (resCollab === null) {
      return cicd;
    }
    cicd.repoCollab = true;
    const leaderName = teamDetails["leaderName"];
    // Create readme file if not exists
    const resReadMeExist = await checkIfReadmeExists(repoName);
    if (resReadMeExist !== true) {
      const resReadMe = await createReadme(leaderName, repoName);
      if (resReadMe === null) {
        return cicd;
      }
    }
    cicd.repoReadMe = true;
    return cicd;
  } catch (error) {
    console.log(error);
    return null;
  }
}

app.post("/admin/approve/ticket/:ticketid", async (req, res) => {
  try {
    const tickerId = req.params.ticketid;
    const password = req.body.password;
    if (password !== ADMIN_PASS) {
      res.status(400).send({
        success: false,
        message: "Password is incorrect"
      });
      return;
    }
    const githubAction = await githubCICD(tickerId);
    if (githubAction === null ||
      githubAction.repoCollab === false ||
      githubAction.repoExist === false ||
      githubAction.repoReadMe === false) {
      res.status(200).send({
        success: false,
        message: "GitHub CICD error",
        githubDetails: githubAction
      });
      return;
    }
    res.status(200).send({
      success: true,
      githubDetails: githubAction
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server started at http://localhost:${process.env.PORT}`);
});
