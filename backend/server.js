const express = require("express")
const cors = require("cors")
const chalk = require("chalk");
const Middleware = require("./Middleware/middleware");
const { errorHandlers } = require("./ErrorHelpers/error");
const db = require("./Database/connection");
const Queries = require("./Database/Queries");
const Helper = require("./Microservice/Microservice");




require('dotenv').config();
const app =express()
const middleware = new Middleware()
const queries = new Queries()
const helper = new Helper();
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "https://00d3-106-222-203-37.ngrok-free.app"
}));
app.use((req,res,next) => {
    middleware.routeHit(req,res,next)
})
errorHandlers(db.getPool())
app.get("/",(req,res) => {
    return res.send("Hello champ !")
})
app.get("/ping", async(req,res) => 
{
    console.log(process.env.DATABASE_URL)
const result = await queries.Ping()
if(result)
    {
       return res.send(result)
    }
    else{
    return res.send("Database is offline :(")
    }
})
app.post("/register" , async(req,res) => {
    const {leaderName,collegeName,email,phone,backupEmail,backupPhone,teamName,themeName,member1,member2,member3} = req.body
    try{
        const result = await queries.Register(leaderName,collegeName,email,phone,backupEmail,backupPhone,teamName,themeName,member1,member2,member3)
        if(result.success)
        {
       await  Helper.sendRegistrationEmail(email,leaderName,teamName,themeName)
        return res.status(200).json(result)
        }
        else{
            return res.json(result)
        }
    }
    catch (e) {
        console.error("Error in /register:", e);
        return res.status(500).json({ success: false, message: "Internal server error" });
      }
   
})
app.listen(process.env.PORT , () => {
    console.log(`Server started at http://localhost:${process.env.PORT}`)
})