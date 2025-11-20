const mysql = require('mysql2/promise');

// Hostinger MySQL Credentials (इन्हें अपनी Hostinger जानकारी से बदलें!)
const db = mysql.createPool({
    host: 'localhost', // आमतौर पर 'localhost' या Hostinger का IP
    user: 'u173296742_aviator', 
    password: 'akgSG@03091995',
    database: 'u173296742_aviator',
    waitForConnections: true,
    connectionLimit: 10
});

async function checkDbConnection() {
    try {
        await db.getConnection();
        console.log('✅ MySQL database connected successfully.');
    } catch (err) {
        console.error('❌ MySQL database connection error:', err);
    }
}

checkDbConnection();

module.exports = db;