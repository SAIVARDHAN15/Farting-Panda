/* ===========================
   ASSET MANAGEMENT
   =========================== */
const assets = {
    panda: new Image(),
    fartingPanda: new Image(),
    pipeUp: new Image(),
    pipeDown: new Image(),
    bg: new Image(),
    loginBg: new Image(),
    logo: new Image() // Not used in canvas, but good to have
};

assets.panda.src = 'assets/panda.png';
assets.fartingPanda.src = 'assets/farting-panda.png';
assets.pipeUp.src = 'assets/bamboo-up.png';
assets.pipeDown.src = 'assets/bamboo-down.png';
assets.bg.src = 'assets/bg.png';
assets.loginBg.src = 'assets/login-bg.png';
assets.logo.src = 'assets/logo.png';

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const menuOverlay = document.getElementById("menu-overlay");
const usernameInput = document.getElementById("username");
const statusMsg = document.getElementById("status-msg");

let socket = null;
let gameState = null;
let gameMode = null;


document.getElementById("btn-online").addEventListener("click", () => initGame("online"));
document.getElementById("btn-offline").addEventListener("click", () => initGame("offline"));

function initGame(mode) {

    const name = usernameInput.value.trim();
    if (name.length < 3) {
        statusMsg.textContent = "Username must be at least 3 chars!";
        statusMsg.style.color = "#ff4444";
        return;
    }

    gameMode = mode;
    menuOverlay.classList.add("hidden");
    
    // Connect Socket
    socket = io();
    socket.on('connect', () => {
        socket.emit('startGame', { username: name, mode: mode });
    });

    socket.on('gameState', (state) => {
        gameState = state;
    });

    socket.on('error_msg', (msg) => {
        alert(msg);
        location.reload();
    });
    console.log("Starting animation loop...");
    requestAnimationFrame(drawGame);
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && socket) {
        e.preventDefault();
        socket.emit('fart');
    }
});

document.addEventListener('touchstart', (e) => {
    if (socket) {
        e.preventDefault();
        socket.emit('fart');
    }
}, { passive: false });


function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(assets.bg.complete) {
        ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#70c5ce";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!gameState) {
        requestAnimationFrame(drawGame);
        return;
    }

    // 3. Draw Pipes
    gameState.pipes.forEach(pipe => {
        const pipeGap = 160; 
        const pipeWidth = 60;
        
        ctx.drawImage(assets.pipeDown, pipe.x, pipe.topHeight - 400, pipeWidth, 400);

        ctx.drawImage(assets.pipeUp, pipe.x, pipe.topHeight + pipeGap, pipeWidth, 400);
    });

    // 4. Draw Players
    for (const id in gameState.players) {
        const p = gameState.players[id];
        
        ctx.save();
        
        const centerX = p.x + 30; // 40px width / 2
        const centerY = p.y + 30; // 40px height / 2
        ctx.translate(centerX, centerY);

        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (p.velocity * 0.1)));
        ctx.rotate(rotation);

        const sprite = (p.velocity < 0) ? assets.fartingPanda : assets.panda;

        // Draw Image (offset by -width/2, -height/2 because of translate)
        ctx.drawImage(sprite, -20, -20, 40, 40);

        ctx.restore();

        // 5. Draw Name Tag & Score
        ctx.fillStyle = "white";
        ctx.font = "bold 14px 'Trebuchet MS'";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(p.username, p.x + 20, p.y - 10);
        ctx.fillStyle = "#FFD700"; // Gold color for score
        ctx.fillText(`Score: ${p.score}`, p.x + 20, p.y - 25);
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(drawGame);
}