const { v4: uuidv4 } = require('uuid');

function generateShortUUID() {
    return uuidv4().replace(/-/g, '').substring(0, 6); 
}
module.exports = generateShortUUID