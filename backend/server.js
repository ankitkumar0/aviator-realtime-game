// server.js के शीर्ष पर आवश्यक मॉड्यूल जोड़ें
const db = require('./db'); // नया MySQL कनेक्शन
const express = require('express');
const bodyParser = require('body-parser'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
// ... बाकी Socket.io कोड और PORT वही रहेगा ...

const app = express();
const http = require('http').createServer(app);

// middleware: Express को JSON और फॉर्म डेटा स्वीकार करने के लिए कहें
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const JWT_SECRET = 'your_super_secret_aviator_key'; // इसे बदलें!

// --- 1. रजिस्टर राउट (MySQL) ---
app.post('/register', async (req, res) => {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        // 1. पासवर्ड हैश करें
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 2. MySQL में INSERT करें
        const [result] = await db.execute(
            'INSERT INTO users (name, phone, password, balance) VALUES (?, ?, ?, 5000.00)',
            [name, phone, hashedPassword]
        );
        
        const newUserId = result.insertId;
        
        // 3. टोकन बनाएँ और भेजें (सफल रजिस्ट्रेशन के बाद ऑटो-लॉगिन)
        const token = jwt.sign({ id: newUserId }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ success: true, token, name: name, balance: 5000.00 });

    } catch (error) {
        if (error.errno === 1062) { // MySQL डुप्लिकेट एंट्री एरर कोड
            return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
        }
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }
});

// --- 2. लॉगिन राउट (MySQL) ---
app.post('/login', async (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ success: false, message: 'Enter phone and password' });
    }

    try {
        // 1. यूजर को फ़ोन नंबर से खोजें
        const [rows] = await db.execute(
            'SELECT id, name, password, balance FROM users WHERE phone = ? LIMIT 1',
            [phone]
        );
        
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid phone or password' });
        }

        // 2. हैश्ड पासवर्ड को सत्यापित करें
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid phone or password' });
        }

        // 3. टोकन बनाएँ और भेजें
        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });

        res.json({ success: true, token, name: user.name, balance: user.balance });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// [बाकी server.js कोड, जैसे http.listen और io.on('connection') यहाँ नीचे आएगा]