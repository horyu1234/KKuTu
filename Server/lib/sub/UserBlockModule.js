/**
 * Created by horyu1234 on 2018-02-09.
 */
const JLog = require('../sub/jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function checkBlockUser(id, callback) {
    let query = "SELECT * " +
        "FROM block_users " +
        "WHERE id=$1;";

    database.query(query, [id], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback === undefined) {
            return;
        }

        let rows = result.rows;
        if (rows.length !== 1) {
            callback({
                block: false
            });
            return;
        }

        let row = rows[0];

        let resultJson = {
            block: true,
            time: new Date(row.time),
            pardonTime: row.pardon_time === null ? null : new Date(row.pardon_time),
            reason: row.reason,
            punisher: row.punisher
        };

        if (resultJson.pardonTime === null) {
            resultJson.permanency = true;
        } else {
            resultJson.permanency = false;

            if (isPardon(resultJson.pardonTime)) {
                resultJson.block = false;
                removeBlockUser(id);
            }
        }

        callback(resultJson);
    })
}

function checkBlockIp(ip, callback) {
    let query = "SELECT * " +
        "FROM block_ips " +
        "WHERE ip=$1;";

    database.query(query, [ip], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback === undefined) {
            return;
        }

        let rows = result.rows;
        if (rows.length !== 1) {
            callback({
                block: false
            });
            return;
        }

        let row = rows[0];

        let resultJson = {
            block: true,
            time: new Date(row.time),
            pardonTime: row.pardon_time === null ? null : new Date(row.pardon_time),
            reason: row.reason,
            punisher: row.punisher
        };

        if (resultJson.pardonTime === null) {
            resultJson.permanency = true;
        } else {
            resultJson.permanency = false;

            if (isPardon(resultJson.pardonTime)) {
                resultJson.block = false;
                removeBlockIp(ip);
            }
        }

        callback(resultJson);
    })
}

function checkBlockChat(id, callback) {
    let query = "SELECT * " +
        "FROM block_chat " +
        "WHERE id=$1;";

    database.query(query, [id], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback === undefined) {
            return;
        }

        let rows = result.rows;
        if (rows.length !== 1) {
            callback({
                block: false
            });
            return;
        }

        let row = rows[0];

        let resultJson = {
            block: true,
            time: new Date(row.time),
            pardonTime: row.pardon_time === null ? null : new Date(row.pardon_time),
            reason: row.reason,
            punisher: row.punisher
        };

        if (resultJson.pardonTime === null) {
            resultJson.permanency = true;
        } else {
            resultJson.permanency = false;

            if (isPardon(resultJson.pardonTime)) {
                resultJson.block = false;
                removeBlockChat(id);
            }
        }

        callback(resultJson);
    })
}

function isPardon(pardonTime) {
    let currentTime = new Date();

    return pardonTime.getTime() < currentTime.getTime();
}

function removeBlockUser(id) {
    let query = "DELETE FROM block_users " +
        "WHERE id=$1";

    database.query(query, [id], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

function removeBlockIp(ip) {
    let query = "DELETE FROM block_ips " +
        "WHERE ip=$1";

    database.query(query, [ip], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

function removeBlockChat(id) {
    let query = "DELETE FROM block_chat " +
        "WHERE id=$1";

    database.query(query, [id], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

exports.checkBlockUser = checkBlockUser;
exports.checkBlockIp = checkBlockIp;
exports.checkBlockChat = checkBlockChat;