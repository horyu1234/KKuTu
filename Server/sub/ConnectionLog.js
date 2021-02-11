const CONNECTION_LOG_TABLE_NAME = 'connection_log';
const IOLog = require('./jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function addLog(id, name, ip, channel, useragent, fingerprint2, pcidC, pcidL) {
    let query = "INSERT INTO " + CONNECTION_LOG_TABLE_NAME + " (time, user_id, user_name, user_ip, channel, user_agent, finger_print_2, pcid_cookie, pcid_localstorage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";

    database.query(query, [new Date(), id, name, ip, channel, useragent, fingerprint2, pcidC, pcidL], (err, result) => {
        if (err) {
            return IOLog.error(`Error executing query ${err.stack}`);
        }
    })
}

exports.addLog = addLog;
