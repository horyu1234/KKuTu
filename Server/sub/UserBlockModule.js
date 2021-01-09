/**
 * Created by horyu1234 on 2018-02-09.
 */
const JLog = require('./jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function checkBlockChat(id, callback) {
    let query = "SELECT * FROM block_chat WHERE user_id=$1;";

    database.query(query, [id], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback === undefined) {
            return;
        }

        let rows = result.rows;
        if (rows.length === 0) {
            callback({
                block: false
            });
            return;
        }

        let row = rows[0];

        let resultJson = {
            block: true,
            id: row.id,
            time: row.time,
            pardonTime: row.pardon_time,
            reason: row.reason,
            punishFrom: row.punish_from,
            admin: row.admin
        };

        if (resultJson.pardonTime === null) {
            resultJson.permanency = true;
        } else {
            resultJson.permanency = false;

            if (isPardon(resultJson.pardonTime)) {
                removeBlockChat(resultJson.id);
                addBlockLog(id, resultJson.id, resultJson.time, resultJson.pardonTime, resultJson.reason, resultJson.punishFrom, resultJson.admin);

                resultJson = {
                    block: false
                };
            }
        }

        callback(resultJson);
    })
}

function isPardon(pardonTime) {
    return new Date(pardonTime).getTime() < new Date().getTime();
}

const removeBlockChat = (caseId) => {
    let query = "DELETE FROM block_chat WHERE id=$1";

    database.query(query, [caseId], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

const addBlockLog = (userId, caseId, time, pardonTime, reason, punishFrom, admin) => {
    let query = "INSERT INTO block_log (log_time, log_type, block_type, user_id, case_id, ip_address, block_time, pardon_time, reason, punish_from, admin) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)";

    database.query(query, [new Date(), 'AUTO_REMOVE', 'CHAT', userId, caseId, null, time, pardonTime, reason, punishFrom, admin], (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }
    })
}

exports.checkBlockChat = checkBlockChat;