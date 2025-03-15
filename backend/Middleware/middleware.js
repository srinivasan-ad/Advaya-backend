const chalk = require("chalk");
const morgan = require("morgan");

class Middleware {
    constructor() {
        this.morgan = morgan("dev");
    }

    routeHit(req, res, next) {
        console.log(chalk.red(`HIT ${req.method} ${req.url}`));
        this.morgan(req, res, next);
    }
}

module.exports = Middleware;
