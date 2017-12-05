const crypto = require('crypto');

exports.encrypt = function (text, key) {
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encipheredContent = cipher.update(text, 'utf8', 'hex');
    encipheredContent += cipher.final('hex');
    return encipheredContent;
};
exports.decrypt = function (text, key) {
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decipheredPlaintext = decipher.update(text, 'hex', 'utf8');
    decipheredPlaintext += decipher.final('utf8');
    return decipheredPlaintext;
};