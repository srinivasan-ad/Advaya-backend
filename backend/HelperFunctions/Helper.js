require("dotenv").config();
const nodemailer = require("nodemailer");
const chalk = require("chalk");

class Helper {
  static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.ADMIN_MAIL_PASS,
    },
  });

  static async sendRegistrationEmail(toEmail, leaderName) {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: toEmail,
      subject: "Registration Successful",
      text: `Hello ${leaderName},\n\nYour registration was successful. Welcome aboard!\n\nBest Regards,\nHackathon Team`,
      html: `<p>Hello <b>${leaderName}</b>,</p>
             <p>Your registration was successful. Welcome aboard!</p>
             <p>Best Regards,<br>Hackathon Team</p>`,
    };

    try {
      const info = await Helper.transporter.sendMail(mailOptions);
      console.log(chalk.green(`Email sent: ${info.messageId}`));
      return true;
    } catch (error) {
      console.error(chalk.red("Error sending email:", error));
      return false;
    }
  }
}

module.exports = Helper;
