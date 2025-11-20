const mysql = require('mysql2/promise');

// Hostinger MySQL Credentials (इन्हें अपनी Hostinger जानकारी से बदलें!)
const db = mysql.createPool({
    host: process.env.DB_HOST, // आमतौर पर 'localhost' या Hostinger का IP
    user: process.env.DB_USER, 
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
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
