const assets = {
    panda: new Image(),
    fartingPanda: new Image(),
    pipeUp: new Image(),
    pipeDown: new Image(),
    bg: new Image(),
    loginBg: new Image(),
    logo: new Image()
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
const gameOverOverlay = document.getElementById("game-over-overlay");
const goScoreDisplay = document.getElementById("go-score");
const goHighScoreDisplay = document.getElementById("go-high-score");
const btnRestart = document.getElementById("btn-restart");

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

    socket.on('gameOver', (data) => {
        const currentScore = data.score;
        let highScore = localStorage.getItem('fartingPandaHighScore') || 0;
        
        if (currentScore > highScore) {
            highScore = currentScore;
            localStorage.setItem('fartingPandaHighScore', highScore);
        }

        goScoreDisplay.textContent = currentScore;
        goHighScoreDisplay.textContent = highScore;
        
        gameOverOverlay.classList.remove("hidden");
    });

    btnRestart.addEventListener("click", () => {
        gameOverOverlay.classList.add("hidden");
        socket.emit('restartGame');
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

    // Draw Pipes
    gameState.pipes.forEach(pipe => {
        const pipeGap = 160; 
        const pipeWidth = 60;
        
        ctx.drawImage(assets.pipeDown, pipe.x, pipe.topHeight - 400, pipeWidth, 400);

        ctx.drawImage(assets.pipeUp, pipe.x, pipe.topHeight + pipeGap, pipeWidth, 400);
    });

    // Draw Players
    for (const id in gameState.players) {
        const p = gameState.players[id];
        
        if (!p.isAlive) continue; 

        ctx.save();
        
        let opacity = 1.0;

        if (id !== socket.id) {
            opacity = 0.5;
        }

        if (p.isInvulnerable) {
            if (Math.floor(Date.now() / 200) % 2 === 0) {
                opacity = 0.3;
            }
        }

        ctx.globalAlpha = opacity;

        const centerX = p.x + 30; 
        const centerY = p.y + 30; 
        ctx.translate(centerX, centerY);

        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (p.velocity * 0.1)));
        ctx.rotate(rotation);

        const sprite = (p.velocity < 0) ? assets.fartingPanda : assets.panda;
        ctx.drawImage(sprite, -20, -20, 40, 40);

        ctx.restore();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px 'Trebuchet MS'";
        ctx.textAlign = "center";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(p.username, p.x + 20, p.y - 10);
        ctx.fillStyle = "#FFD700"; 
        ctx.fillText(`Score: ${p.score}`, p.x + 20, p.y - 25);
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(drawGame);
}