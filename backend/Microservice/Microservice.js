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

  static async sendRegistrationEmail(toEmail, leaderName, teamName, themeName) {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: toEmail,
      subject: "Registration Successful",
      text: `Hello ${leaderName},\n\nYour registration was successful. Welcome aboard!\n\nBest Regards,\nHackathon Team`,
      html: `<p>Hello <b>${leaderName}</b>,</p>
             <p>Your team -> <b>${teamName}</b>'s registration under the theme <b><u>${themeName}</u></b> was successful. Welcome aboard!</p>
             <p>Best Regards,<br>Hackathon Team</p>`,
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
