const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const Helper = require("./Microservice");

const DATA_FILE_EMAILS = path.join(__dirname, "data2.json");

async function retryFailedEmails() {
    if (!fs.existsSync(DATA_FILE_EMAILS)) return;

    let failedEmails = JSON.parse(fs.readFileSync(DATA_FILE_EMAILS, "utf8"));
    if (failedEmails.length === 0) return;

    console.log(chalk.yellow(`Retrying ${failedEmails.length} failed emails...`));

    let newFailedEmails = [];

    for (const emailData of failedEmails) {
        const success = await Helper.sendRegistrationEmail(
            emailData.toEmail,
            emailData.leaderName,
            emailData.teamName,
            emailData.themeName,
            emailData.member1,
            emailData.member2,
            emailData.member3
        );

        if (!success) {
            newFailedEmails.push(emailData); 
        }
    }

    fs.writeFileSync(DATA_FILE_EMAILS, JSON.stringify(newFailedEmails, null, 2));
    console.log(chalk.green(`Retry process completed. Remaining failed emails: ${newFailedEmails.length}`));
}
function retryHandler() {
    if (!fs.existsSync(DATA_FILE_EMAILS)) return;
    let failedEmails = JSON.parse(fs.readFileSync(DATA_FILE_EMAILS,"utf8"))
    if(failedEmails.length > 0)
    {
        retryFailedEmails()
    }
}

setInterval(retryHandler, 30000);

