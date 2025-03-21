const express = require("express");
const cors = require("cors");
require('./Database/retry')
require('./Microservice/retry_mail')
const chalk = require("chalk");
const Middleware = require("./Middleware/middleware");
const { errorHandlers } = require("./ErrorHelpers/error");
const db = require("./Database/connection");
const Queries = require("./Database/Queries");
const Helper = require("./Microservice/Microservice");

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


const ADMIN_COMMENT_PASS = `d@)cX$tv(M'/K&N8e3~n`;
const ADMIN_PASS = `L%):Y@w4"^K8;9UH6Puqj2mXd#R+ZgW]kyxSD7bv5n<c_e}.s,`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SECRET))
app.use("/qrcodes", express.static(path.join(__dirname, "public/qrcodes")));
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
app.post("/whatsapp" , async(req , res) => {
  const {teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid} = req.body
  const createMessage = await twilloWhatsapp.createMessage(teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid)
  console.log(createMessage)
  const phone_no = req.body.WaId; 
  const message = req.body.Body;
  console.log(`Received message: "${message}"`);
  console.log(`Phone number: "${phone_no}"`);
  const qrFilePath = await twilloWhatsapp.generateQRFile(`advaya.bgscet.ac.in/ticket/${uuid}`, uuid);
  const qrPublicUrl = `${process.env.SERVER_URL}/qrcodes/qr_${uuid}.png`;

  const response = twilloWhatsapp.response.message();
  response.body("QR Code for your ticket:");
  response.media(qrPublicUrl); 

  res.set("Content-Type", "text/xml");
  res.send(response.toString());
})
app.post("/coupon", async (req,res) =>{ 
  const {couponCode} = req.body
  try{
    const result = await queries.couponsValidation(couponCode);
    if (!result.success) {
      return res.status(400).json(result)
    }
    if(result.success)
    {  
    return res.status(200).json(result)
  }
  }
  catch (e) {
    return res.status(500).json({ success: false, message: "internal server error" })

  }
});

//change coupon to check validity api then use coupon api to toggle payment in last check the coupon code in form data and secrement it 
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
        razorpay_signature,
        formData.couponCode
      );
      if (result.success) {
        const mail_res = await Helper.sendRegistrationEmail(
          formData.email,
          formData.leaderName,
          formData.teamName,
          formData.themeName
        );
        console.log(mail_res)
        result.verified = true
        console.log(result)
      }
      res.status(200).json({success: true, teamId: uuid});
    }
    else {
      res.status(200).json({ success: false });
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

const sessionIds = [];
app.post("/admin/login", (req, res) => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PASS) {
      const sessionId = v4();
      sessionIds.push(sessionId);
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: true,
        signed: true,
        path: "/",
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
      res.status(200).send({
        success: true,
        pass: true,
        message: "Password is correct. You can use all admin APIs."
      });
      return;
    }
    else {
      res.status(200).send({
        success: true,
        pass: false,
        message: "Password is incorrect"
      });
      return;
    }
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
});

app.post("/admin/verify", (req, res) => {
  try {
    const { sessionId } = req.signedCookies;
    if (sessionIds.includes(sessionId)) {
      res.status(200).send({
        success: true,
        doLogin: false,
        message: "Welcome Admin."
      });
      return;
    }
    else {
      res.status(200).send({
        success: true,
        doLogin: true,
        message: "Please login."
      });
      return;
    }
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
});

app.post("/admin/approve/ticket/:ticketid", (req, res) => {
  try {
    const tickerId = req.params.ticketid;
    const { sessionId } = req.signedCookies;
    if (sessionIds.includes(sessionId)) {
      res.status(200).send({
        success: true,
        doLogin: false,
        message: "Welcome Admin."
      });
      return;
    }
    else {
      res.status(200).send({
        success: true,
        doLogin: true,
        message: "Please login."
      });
      return;
    }
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error });
  }
});
app.post("/whatsapp" , async(req , res) => {
  const {teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid} = req.body
  const createMessage = await twilloWhatsapp.createMessage(teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid)
  console.log(createMessage)
  const phone_no = req.body.WaId; 
  const message = req.body.Body;
  console.log(`Received message: "${message}"`);
  console.log(`Phone number: "${phone_no}"`);

  const response = twilloWhatsapp.response.message()
  response.body("qr code");
  const img_src = "https"
  response.media(img_src);

  res.set('Content-Type', 'text/xml'); 
  res.send(response.toString()); 
})
app.listen(process.env.PORT, () => {
  console.log(`Server started at http://localhost:${process.env.PORT}`);
});
