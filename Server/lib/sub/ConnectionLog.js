/**
 * Created by horyu1234 on 2018-02-03.
 */
const CONNECTION_LOG_TABLE_NAME = 'connection_log';
const JLog = require('../sub/jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function addLog(id, name, ip, channel, useragent, fingerprint2) {
    let time = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    let query = "INSERT INTO " + CONNECTION_LOG_TABLE_NAME + " " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7)";

    database.query(query, [time, id, name, ip, channel, useragent, fingerprint2], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

exports.addLog = addLog;