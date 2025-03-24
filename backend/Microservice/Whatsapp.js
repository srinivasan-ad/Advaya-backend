require("dotenv").config();
const twillo = require("twilio")
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const MessagingResponse = require("twilio/lib/twiml/MessagingResponse");
const messaingresponse = require('twilio').twiml.MessagingResponse;
const accountSid = process.env.TWILLO_ACCOUNT_SID;
const authToken = process.env.TWILLO_AUTH_TOKEN;
const client =  twillo(accountSid,authToken)
const response = new MessagingResponse();
async function createMessage(teamLeadernumber,teamLeader,teamName,member1,member2,member3,themeName,uuid) {
  const mem1 = member1 ? member1 : "none";
  const mem2 = member2 ? member2 : "none";
  const mem3 = member3 ? member3 : "none";
  if(!member1)
  console.log("content sid : ",  process.env.CONTENT_SID )
    const message = await client.messages.create({
      contentSid: process.env.CONTENT_SID,
      contentVariables: JSON.stringify({
        "1": teamLeader,
        "2": teamName,
        "3": mem1,
        "4": mem2,
        "5": mem3,
        "6": "https://maps.app.goo.gl/ka1c7rt7QMYEfayu5?g_st=iw",
        "7" : themeName,
        "8": `https://advaya.bgscet.ac.in/ticket/${uuid}`,
        "9" : "https://www.instagram.com/advaya_hackathon/",
        "10" : "+917892466923",
        "11" : "advaya@bgscet.ac.in"
      }),
      from: process.env.WHATSAPP_NUMBER,
      messagingServiceSid: process.env.MESSAGING_ID,
      to: `whatsapp:+91${teamLeadernumber}`,
      interactiveData: {
        type: 'button',
        buttons: [
          {
            title: 'Ok',
            payload: uuid 
          }
        ]
      }

    });
    
    // Log the entire message response
    console.log("Message Response:", message);
    
    // Check specific fields
    console.log("Message SID:", message.sid);
    console.log("Message Status:", message.status);
    console.log("Error Code:", message.errorCode || "No error");
    console.log("Error Message:", message.errorMessage || "No error");
console.log(teamLeadernumber)
console.log(process.env.WHATSAPP_NUMBER)
  console.log(message.body);

  return "message sent";
}
// async function createMessage(to_number ) {
//   const message = await client.messages.create({
//     contentSid: process.env.CONTENT_SID  ,
//     contentVariables: JSON.stringify({
//         "1": "Sinch",
//         "2": "maarsh",
//         "3": "Ansh",
//         "4": "minus",
//         "5": "ringus",
//         "6": "OGIWHOEIGWH",
//         "7" : "WOW"
//     }),
//     from: "whatsapp:+918951132908",
//     messagingServiceSid: process.env.MESSAGING_ID,
//     to: `whatsapp:+919880284141`,
//   });
// console.log(process.env.MESSAGING_ID)
//   console.log(message.body);

//   return "message sent";
// }
async function generateQRFile(link, uuid) {
  const qrFolder = path.join(__dirname, "public/qrcodes"); 
  if (!fs.existsSync(qrFolder)) {
    fs.mkdirSync(qrFolder, { recursive: true });
  }

  const filename = `qr_${uuid}.png`; 
  const filePath = path.join(qrFolder, filename);

  try {
    await QRCode.toFile(filePath, link);
    console.log("QR Code saved successfully:", filePath);
    return {filePath, filename};
  } catch (error) {
    console.error("Error generating QR Code:", error);
    return null;
  }
}
module.exports = {
    createMessage,
    generateQRFile,
    response    
};
