const crypto = require('crypto-js');

const CONFIG = {
    API_KEY_SECRET: 'ttzbkict',
    API_KEY_DECRYPT: 'api-key-ttz-bkict'
};

function decryptString(message, secretKey = CONFIG.API_KEY_SECRET) {
    return new Promise((resolve, reject) => {
        if (!secretKey) {
            reject(new Error('Secret key is required'));
        } else {
            try {
                const bytes = crypto.AES.decrypt(message, secretKey);
                const data = bytes.toString(crypto.enc.Utf8);
                if (!data) reject(new Error("Failed to decrypt or invalid key"));
                else resolve(data);
            } catch (err) {
                reject(err);
            }
        }
    });
}

module.exports = {
    decryptString,
    CONFIG
};
