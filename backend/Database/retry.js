const fs = require("fs");
const path = require("path");

const chalk = require("chalk");
const Queries = require("./Queries");

const DATA_FILE = path.join(__dirname, "data.json");

async function retryFailedEntries() {
  if (!fs.existsSync(DATA_FILE)) return;

  let failedEntries = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  if (failedEntries.length === 0) return;

  console.log(
    chalk.yellow(`Retrying ${failedEntries.length} failed entries...`)
  );

  const queries = new Queries();
  let newFailedEntries = [];
  console.log("Retrying :)");
  for (const data of failedEntries) {
    const response = await queries.Register(
      data.uuid,
      data.leader,
      data.college,
      data.email,
      data.phone,
      data.backup_email,
      data.backup_phone,
      data.team_name,
      data.theme_name,
      data.member1,
      data.member2,
      data.member3,
      data.razorpay_order_id,
      data.razorpay_payment_id,
      data.razorpay_signature
    );

    if (!response.success) {
      newFailedEntries.push(data);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(newFailedEntries, null, 2));
  console.log(
    chalk.green(
      `Retry process completed. Remaining failed entries: ${newFailedEntries.length}`
    )
  );
}

function retryHandler() {
  if (!fs.existsSync(DATA_FILE)) return;

  const failedEntries = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  if (failedEntries.length > 0) {
    console.log(
      chalk.blue(`Retrying ${failedEntries.length} failed entries...`)
    );
    retryFailedEntries();
  } else {
    console.log(chalk.green("No failed entries to retry."));
  }
}

setInterval(retryHandler, 30000);
