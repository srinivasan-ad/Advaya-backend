const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const DATA_FILE = path.join(__dirname, "data.json");

function generateShortUUID() {
    return uuidv4().replace(/-/g, "").substring(0, 6);
}

function saveToFile(data) {
    try {
        let existingData = [];

        if (fs.existsSync(DATA_FILE)) {
            const fileContent = fs.readFileSync(DATA_FILE, "utf8").trim();
            if (fileContent) {
                try {
                    existingData = JSON.parse(fileContent);
                    if (!Array.isArray(existingData)) {
                        existingData = [];
                    }
                } catch (err) {
                    console.log(chalk.red("Corrupted JSON file, resetting data.json"));
                    existingData = [];
                }
            }
        }

        existingData.push(data);
        fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
        console.log(chalk.blue("Data saved to file for retry."));
    } catch (error) {
        console.log(chalk.red("Error saving to file:", error));
    }
}

module.exports = { generateShortUUID, saveToFile };
