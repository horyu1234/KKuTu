const IOLog = require('./jjlog');

let database;

exports.initDatabase = function (_database) {
    database = _database;
};

function processVendorMigration(userId, callback) {
    let oldUserId = userId.split('-')[1];

    hasUser(oldUserId, function (result) {
        if (result) {
            modifyOldUserId(oldUserId, userId, function () {
                modifyFriendsUserId(oldUserId, userId, function () {
                    IOLog.info(`${oldUserId} 의 식별 번호가 ${userId} 로 마이그레이션 되었습니다.`);

                    if (callback !== undefined) {
                        callback();
                    }
                });
            });
        } else {
            // TODO: 친구 목록 수정 이전에 마이그레이션된 계정을 위한 임시 조취이므로, 향후 제거 필요
            modifyFriendsUserId(oldUserId, userId, function () {
                if (callback !== undefined) {
                    callback();
                }
            });
        }
    });
}

function hasUser(userId, callback) {
    let query = "SELECT * " +
        "FROM users " +
        "WHERE _id = '" + userId + "';";

    database.query(query, (err, result) => {
        if (err) {
            return IOLog.error(`Error executing query ${err.stack}`);
        }

        if (callback !== undefined) {
            callback(result.rows.length === 1);
        }
    })
}

function modifyOldUserId(oldUserId, userId, callback) {
    let query = "UPDATE users " +
        "SET _id = '" + userId + "' " +
        "WHERE _id = '" + oldUserId + "';";

    database.query(query, (err) => {
        if (err) {
            return IOLog.error(`Error executing query ${err.stack}`);
        }

        if (callback !== undefined) {
            callback();
        }
    })
}

function modifyFriendsUserId(oldUserId, userId, callback) {
    let query = "UPDATE users " +
        "SET friends = cast(REPLACE(friends :: TEXT, '\"" + oldUserId + "\"', '\"" + userId + "\"') AS JSON) " +
        "WHERE friends :: TEXT ~ '\"" + oldUserId + "\"';";

    database.query(query, (err) => {
        if (err) {
            return IOLog.error(`Error executing query ${err.stack}`);
        }

        if (callback !== undefined) {
            callback();
        }
    })
}

exports.processVendorMigration = processVendorMigration;