const MIGRATION_TABLE_NAME = 'users_migration';
const JLog = require('./jjlog');
const crypto = require('crypto');

let database;

exports.initDatabase = function (_database) {
    database = _database;

    JLog.info("<< KKuTu Server Migration Process :: initDatabase >>");
};

function getMigration(whereQuery, callback) {
    let query = "SELECT * " +
        "FROM " + MIGRATION_TABLE_NAME + " " +
        "WHERE " + whereQuery + ";";

    database.query(query, (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback !== undefined) {
            callback(result.rows);
        }
    })
}

function addMigration(userId, vendor, callback) {
    const uniqueCode = getUniqueCode(userId, vendor);

    let query = "INSERT INTO " + MIGRATION_TABLE_NAME + " " +
        "VALUES ('" + uniqueCode + "', '" + userId + "', '" + vendor + "', null, false)";

    database.query(query, (err, result) => {
        if (err) {
            return JLog.error(`Error executing query ${err.stack}`);
        }

        if (callback !== undefined) {
            callback(uniqueCode);
        }
    })
}

function getUniqueCode(userId, vendor) {
    return crypto.createHash('sha256').update(userId + '-' + vendor).digest('base64');
}

exports.getMigration = getMigration;
exports.addMigration = addMigration;
