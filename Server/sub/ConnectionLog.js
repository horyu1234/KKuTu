const CONNECTION_LOG_TABLE_NAME = 'connection_log';
const JLog = require('./jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function addLog(id, name, ip, channel, useragent, fingerprint2) {
    let currentTime = new Date();
    currentTime.setHours(currentTime.getHours() + 9);
    currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');

    let timeText = currentTime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    let query = "INSERT INTO " + CONNECTION_LOG_TABLE_NAME + " " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7)";

    database.query(query, [timeText, id, name, ip, channel, useragent, fingerprint2], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

exports.addLog = addLog;