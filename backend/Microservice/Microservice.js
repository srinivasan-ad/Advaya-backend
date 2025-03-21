require("dotenv").config();
const nodemailer = require("nodemailer");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const DATA_FILE_EMAILS = path.join(__dirname, "data2.json");
// class Helper {
//   static transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.ADMIN_EMAIL,
//       pass: process.env.ADMIN_MAIL_PASS,
//     },
//   });

//   static async sendRegistrationEmail(toEmail, leaderName,teamName,themeName) {
//     const mailOptions = {
//       from: process.env.ADMIN_EMAIL,
//       to: toEmail,
//       subject: "Registration Successful",
//       text: `Hello ${leaderName},\n\nYour registration was successful. Welcome aboard!\n\nBest Regards,\nHackathon Team`,
//       html: `<p>Hello <b>${leaderName}</b>,</p>
//              <p>Your team -> <b>${teamName}</b>'s registration under the theme <b><u>${themeName}</u></b> was successful. Welcome aboard!</p>
//              <p>Best Regards,<br>Hackathon Team</p>`,
//     };

//     try {
//       const info = await Helper.transporter.sendMail(mailOptions);
//       console.log(chalk.green(`Email sent: ${info.messageId}`));
//       return true;
//     } catch (error) {
//       console.error(chalk.red("Error sending email:", error));
//       return;
//     }
//   }
// }


function saveFailedEmail(data) {
    try {
        if (!fs.existsSync(DATA_FILE_EMAILS)) {
            fs.writeFileSync(DATA_FILE_EMAILS, JSON.stringify([]));
        }
        const existingData = JSON.parse(fs.readFileSync(DATA_FILE_EMAILS, "utf8"));
        existingData.push(data);
        fs.writeFileSync(DATA_FILE_EMAILS, JSON.stringify(existingData, null, 2));
        console.log(chalk.blue("Email failure saved for retry."));
    } catch (error) {
        console.log(chalk.red("Error saving failed email:", error));
    }
}

class Helper {
  static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_MAIL_PASS,
    },
  });

  static async sendRegistrationEmail(toEmail, leaderName, teamName, themeName, member1, member2, member3) {
    const emailHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Registering - ADVAYA HACKATHON</title>
        <style>
          body {line-height: 1.4; color: #3a3a3a; margin: 0; padding: 0; background-color: #ffe1db; font-family: 'Arial', sans-serif;}
          .logo_container {display: flex; justify-content: center; align-items: center; padding: 15px 20px; background-color: #fac2b2; border-bottom: 3px solid #bc3a41;}
          .img_logo {width: 50%; height: auto; margin: 5px; object-fit: contain;}
          h1, h2, p {margin: 10px 0; padding: 0; text-align: center;}
          h1 {font-size: 28px; text-transform: uppercase;}
          h2 {font-family: 'League Gothic', sans-serif; font-weight: bold; color: #bc3a41; font-size: 220%; text-transform: uppercase; letter-spacing: 1px;}
          .theme_moment {font-family: 'League Gothic', sans-serif; font-weight: bold; color: #bc3a41; font-size: 190%; text-transform: uppercase; letter-spacing: 1px;}
          .container {max-width: 700px; margin: 20px auto; padding: 20px; background-color: #fac2b2; border-radius: 10px; box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.1);}
          .header {text-align: center; padding: 20px 0; background-color: #f13f3e; color: white; font-size: 24px; font-weight: bold; border-radius: 10px 10px 0 0;}
          .content {padding: 25px; text-align: center; background-color: #ffe1db; border-radius: 10px;}
          .Team_info ul {list-style-type: none; padding: 0; margin-left: 20px;}
          .Team_info li {background: #fac2b2; padding: 8px; margin: 5px 0; border-radius: 5px; font-weight: bold;}
          .date-highlight {font-weight: bold; font-size: 20px; color: #bc3a41;}
          .button {display: inline-block; padding: 12px 20px; background-color: #bc3a41; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; transition: 0.3s;}
          .button:hover {background-color: #f13f3e; transform: scale(1.05);}
          .footer {text-align: center; padding: 15px; font-size: 14px; color: #5b5b5b; background-color: #fac2b2; border-radius: 0 0 10px 10px;}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ADVAYA HACKATHON</h1>
            </div>
            <div class="logo_container">
                <img src= cid:logo_cid class="img_logo">
            </div>
            <div class="content">
                <h2 class="register">Registration Confirmed!</h2>
                <p><b>${leaderName}</b>, we're glad to have you on board for the ADVAYA HACKATHON!</p>
                <p>Looking forward to seeing your ideas come to life as you collaborate, innovate, and build something great.</p>
                <div class="Theme_name">
                    <h2 class="theme_moment">Theme: ${themeName}</h2>
                </div>
                <div class="Team_info">
                    <p>TEAM NAME: <b>${teamName}</b></p>
                    <p>TEAM MEMBERS:</p>
                    <ul>
                        <li>${member1}</li>
                        <li>${member2}</li>
                        <li>${member3}</li>
                    </ul>
                </div>
                <p>Have fun, give it your best, and enjoy the experience. Good luck! 🚀</p>
                <div class="date-highlight">
                    Mark your calendars, see you on <b>April 11th, 2025</b>
                </div>
                <a href=""https://advaya.bgscet.ac.in" class="button">Go to Website</a>
            </div>
            <div class="footer">
                <p>You will receive another confirmation via WhatsApp, after which a QR code will be sent. Please present this QR code on the day of the hackathon to confirm your registration.</p>
                <p>Don't forget to follow us for updates: <a href="https://instagram.com" target="_blank">Instagram</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: toEmail,
      subject: "Registration Successful",
      text: `Hello ${leaderName},\n\nYour registration was successful. Welcome aboard!\n\nBest Regards,\nHackathon Team`,
      html: emailHTML,
    };

    try {
      const info = await Helper.transporter.sendMail(mailOptions);
      console.log(chalk.green(`Email sent: ${info.messageId}`));
      return true;
    } catch (error) {
      console.error(chalk.red("Error sending email:", error));
      saveFailedEmail({ toEmail, leaderName, teamName, themeName });
      return false;
    }
  }
}

module.exports = Helper;
