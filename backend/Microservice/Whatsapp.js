require("dotenv").config();
const twillo = require("twilio")
const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const client = new twillo(accountSid,authToken)
async function twilloWhatsapp()
{
    console.log(accountSid,authToken)
    client.messages
    .create({
      content_sid : content_sid,
      from: "whatsapp:+918951132908", 
      to: "whatsapp:+919880284141",  
      body: "Hello harshith you are being kidnapped",
      messaging_service_id : messaging_service_id
    })
    .then((message) => console.log("Message sent:", message.sid) )
    .catch((error) => console.error("Error sending message:", error));
}
module.exports = twilloWhatsapp
