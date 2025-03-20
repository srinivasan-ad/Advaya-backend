require("dotenv").config();
const twillo = require("twilio")
const messaingresponse = require('twilio').twiml.MessagingResponse;
const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const client =  twillo(accountSid,authToken)
const response = new messaingresponse();
async function createMessage(teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid) {
  const message = await client.messages.create({
    contdentSid: process.env.CONTENT_SID  ,
    contentVariables: JSON.stringify({
        "1": teamLeader,
        "2": teamName,
        "3": member1,
        "4": member2,
        "5": member3,
        "6": themeName,
        "7" : `advaya.bgscet.ac.in/ticket/${uuid}`
    }),
    from: process.env.WHATSAPP_NUMBER,
    messagingServiceSid: process.env.MESSAGING_ID,
    to: `whatsapp:+91${teamLeadernumber}`,
  });

  console.log(message.body);

  return "message sent";
}

module.exports = {
    createMessage,
    response    
};
