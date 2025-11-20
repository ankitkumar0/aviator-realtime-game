// बैक-एंड सर्वर से कनेक्ट करें
const socket = io('http://localhost:3000'); 

// HTML एलिमेंट्स
const multiplierDisplay = document.getElementById('multiplier');
const placeBetBtn = document.getElementById('placeBetBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const betAmountInput = document.getElementById('betAmount');
const betIncreaseBtn = document.getElementById('betIncrease');
const betDecreaseBtn = document.getElementById('betDecrease');
const gameStatusBar = document.getElementById('gameStatusBar'); // स्टेटस बार जहां पिछले राउंड दिखेंगे

// Canvas सेटअप
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let animationFrameId; // एनिमेशन लूप के लिए

// गेम की स्थिति
let currentBet = 0;
let hasBet = false;
let gameHistory = []; // पिछले राउंड के परिणामों के लिए
const MAX_HISTORY_ITEMS = 5; // कितने पिछले राउंड दिखाने हैं

// ---------------------- Canvas एनिमेशन लॉजिक ----------------------
function drawPlane(currentMultiplier) {
    // कैनवास को साफ़ करें
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // मल्टीप्लायर के आधार पर प्लेन की स्थिति और ग्राफ
    // एक सरल वक्र (curve) का उपयोग करें
    const progress = (Math.log(currentMultiplier) / Math.log(10)) * canvas.width; // 10x पर फुल विड्थ
    const y = canvas.height - (Math.log(currentMultiplier) / Math.log(10)) * canvas.height * 0.8; // ऊपर जाता हुआ

    // ग्राफ लाइन
    ctx.beginPath();
    ctx.moveTo(0, canvas.height); // नीचे बाईं ओर से शुरू करें
    ctx.lineTo(progress, y);
    ctx.strokeStyle = '#00bf73'; // लाइन का रंग हरा
    ctx.lineWidth = 3;
    ctx.stroke();

    // प्लेन का चित्रण (सरल रूप से)
    ctx.fillStyle = '#ff0055'; // प्लेन का रंग गुलाबी
    ctx.beginPath();
    ctx.arc(progress, y, 10, 0, Math.PI * 2); // एक गोलाकार प्लेन
    ctx.fill();

    // छोटे डॉट्स जो प्लेन के पीछे दिखते हैं
    const numDots = Math.floor(progress / 30);
    for (let i = 0; i < numDots; i++) {
        const dotX = progress - (i * 30);
        const dotY = canvas.height - (Math.log(currentMultiplier * (dotX / progress)) / Math.log(10)) * canvas.height * 0.8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function animateGame(currentMultiplier) {
    // हर एनिमेशन फ्रेम पर प्लेन को ड्रॉ करें
    drawPlane(currentMultiplier);
    animationFrameId = requestAnimationFrame(() => animateGame(currentMultiplier)); // खुद को फिर से कॉल करें
}

// ---------------------- Socket.io इवेंट हैंडलिंग ----------------------

socket.on('game:update', (data) => {
    const currentMultiplier = parseFloat(data.multiplier);
    multiplierDisplay.textContent = `${currentMultiplier.toFixed(2)}x`;
    multiplierDisplay.classList.remove('crashed'); // सुनिश्चित करें कि यह लाल न हो

    // Canvas एनिमेशन अपडेट करें
    cancelAnimationFrame(animationFrameId); // पिछला फ्रेम रद्द करें
    animateGame(currentMultiplier);
    
    if (hasBet) {
        const possibleWinnings = currentBet * currentMultiplier;
        cashOutBtn.textContent = `Cash Out (${possibleWinnings.toFixed(2)})`;
    }
});

socket.on('game:start', () => {
    multiplierDisplay.textContent = '1.00x';
    multiplierDisplay.classList.remove('crashed');
    multiplierDisplay.style.color = '#00bf73'; // हरा
    placeBetBtn.disabled = false;
    cashOutBtn.disabled = true;
    currentBet = 0;
    hasBet = false;
    cashOutBtn.textContent = 'Cash Out (0.00)';
    console.log('New Round Started on client.');

    // कैनवास को रीसेट करें
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 1.00x पर प्लेन को शुरू में ड्रॉ करें
    drawPlane(1.00); 
});

socket.on('game:crash', (data) => {
    const crashMultiplier = parseFloat(data.multiplier);
    multiplierDisplay.textContent = `${crashMultiplier.toFixed(2)}x (CRASHED!)`;
    multiplierDisplay.classList.add('crashed'); // लाल करें
    multiplierDisplay.style.color = '#e53935'; // लाल
    placeBetBtn.disabled = true;
    cashOutBtn.disabled = true;

    cancelAnimationFrame(animationFrameId); // एनिमेशन रोकें
    drawPlane(crashMultiplier); // अंतिम क्रैश पॉइंट पर प्लेन को ड्रॉ करें

    if (hasBet) {
        alert(`CRASHED! You lost your bet of ${currentBet}`);
    }
    console.log(`Game Crashed at ${crashMultiplier.toFixed(2)}x`);

    // इतिहास में जोड़ें
    gameHistory.unshift({ multiplier: crashMultiplier, crashed: true });
    if (gameHistory.length > MAX_HISTORY_ITEMS) {
        gameHistory.pop();
    }
    updateGameStatusBar();
});

// ---------------------- UI इंटरेक्शन लॉजिक ----------------------

// बेट बढ़ाने/घटाने के बटन
betIncreaseBtn.addEventListener('click', () => {
    betAmountInput.value = parseInt(betAmountInput.value) + 1;
});

betDecreaseBtn.addEventListener('click', () => {
    if (parseInt(betAmountInput.value) > 1) {
        betAmountInput.value = parseInt(betAmountInput.value) - 1;
    }
});

placeBetBtn.addEventListener('click', () => {
    const amount = parseFloat(betAmountInput.value);
    if (amount > 0) {
        currentBet = amount;
        hasBet = true;
        placeBetBtn.disabled = true;
        cashOutBtn.disabled = false;
        alert(`Bet of ${currentBet} placed!`);
        // यहाँ सर्वर को बेट की सूचना भेजें: socket.emit('placeBet', { amount: currentBet });
    }
});

cashOutBtn.addEventListener('click', () => {
    if (hasBet) {
        const currentMultiplierValue = parseFloat(multiplierDisplay.textContent.slice(0, -1));
        const winnings = currentBet * currentMultiplierValue;

        alert(`✅ CASHED OUT at ${currentMultiplierValue.toFixed(2)}x! Winnings: ${winnings.toFixed(2)}`);
        
        cashOutBtn.disabled = true; 
        hasBet = false;
        
        // यहाँ सर्वर को कैश आउट की सूचना भेजें: socket.emit('cashOut', { multiplier: currentMultiplierValue });
    }
});

function updateGameStatusBar() {
    gameStatusBar.innerHTML = ''; // पुराना स्टेटस क्लियर करें
    gameHistory.forEach(item => {
        const span = document.createElement('span');
        span.classList.add('game-status-item');
        if (item.crashed) {
            span.classList.add('crashed');
        } else {
            span.classList.add('active'); // अगर कैश आउट हो जाता है, तो हरा दिखा सकते हैं
        }
        span.textContent = `${item.multiplier.toFixed(2)}x`;
        gameStatusBar.appendChild(span);
    });
}


// पेज लोड होने पर कैनवास का आकार सेट करें
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    // अगर गेम चल रहा है, तो प्लेन को फिर से ड्रॉ करें
    if (multiplierDisplay.textContent !== 'Connecting...' && multiplierDisplay.textContent !== '1.00x') {
        drawPlane(parseFloat(multiplierDisplay.textContent));
    } else {
        drawPlane(1.00); // शुरू में प्लेन को ड्रॉ करें
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // पहली बार लोड होने पर भी आकार सेट करें