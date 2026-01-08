const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '../public')));

const games = {};

io.on('connection', (socket) => {

    socket.on('startGame', (data) => {
        if (socket.myRoom) {
            return; 
        }
        let roomName;
        socket.username = data.username;

        if (data.mode === 'online') {
            roomName = 'room-public';
            const room = io.sockets.adapter.rooms.get(roomName);
            
            if (room && room.size >= 10) {
                socket.emit('error_msg', 'Room is full!');
                return;
            }
        } else {
            roomName = 'room-' + socket.id;
        }

        socket.join(roomName);
        socket.myRoom = roomName;

        if (!games[roomName]) {
            games[roomName] = createNewGame();
        }

        // Initialize player
        games[roomName].players[socket.id] = {
            id: socket.id,
            username: data.username,
            x: 100,
            y: 200,
            velocity: 0,
            score: 0,
            isAlive: true,
            color: getRandomColor() // Assign a color for name tags
        };

        if (!games[roomName].interval) {
            startGameLoop(roomName);
        }

        console.log(`User joined: ${data.username} in ${roomName}`);
    });

    socket.on('flap', () => {
        const room = socket.myRoom;
        if (!room) return;
        const player = games[room].players[socket.id];
        if (player && player.isAlive) {
            console.log(`Flap from ${player.username}`);
            player.velocity = -7; 
        }
    });

    socket.on('disconnect', () => {
        const room = socket.myRoom;
        if (room && games[room]) {
            delete games[room].players[socket.id];
            
            // If room is empty, clean it up
            const roomObj = io.sockets.adapter.rooms.get(room);
            if (!roomObj || roomObj.size === 0) {
                clearInterval(games[room].interval);
                delete games[room];
            }
        }
        console.log(`User disconnected: ${socket.username}`);
    });

});

function createNewGame() {
    return {
        players: {},
        pipes: [],
        frameCount: 0,
        interval: null
    };
}

function startGameLoop(roomName) {
    // UPDATED: Running at 60 FPS (approx 16ms)
    const intervalId = setInterval(() => {
        const gameState = games[roomName];

        // Safety check if game was deleted
        if (!gameState) {
            clearInterval(intervalId);
            return;
        }

        const room = io.sockets.adapter.rooms.get(roomName);
        if (!room || room.size === 0) {
            clearInterval(intervalId);
            delete games[roomName];
            console.log(`Game ended: ${roomName}`);
            return;
        }

        gameState.frameCount++;
        runGame(gameState);

        io.to(roomName).emit('gameState', gameState);

    }, 1000 / 60); 

    games[roomName].interval = intervalId;
}

function runGame(gameState) {
    const HEIGHT = 600; // Match canvas height
    const WIDTH = 800;
    const PIPE_WIDTH = 50;
    const PIPE_GAP = 160; // Slightly wider for better gameplay
    
    // Physics tuned for 60 FPS
    const GRAVITY = 0.35; 

    updatePipes(gameState, WIDTH, HEIGHT, PIPE_WIDTH, PIPE_GAP);

    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        
        if (!player.isAlive) continue;

        // Apply Gravity
        player.velocity += GRAVITY;
        player.y += player.velocity;

        
        // 1. Ground/Ceiling
        if (player.y + 25 > HEIGHT || player.y < 0) {
            killPlayer(gameState, playerId);
            continue;
        }

        // 2. Pipes
        const playerHitbox = { x: player.x + 10, y: player.y + 10, w: 25, h: 25 }; // Shrink hitbox slightly for fairness

        for (const pipe of gameState.pipes) {
            
            if (!pipe.scoredBy[playerId] && pipe.x + PIPE_WIDTH < player.x) {
                pipe.scoredBy[playerId] = true;
                player.score++;
            }

            // Pipe Collision Check
            if (
                playerHitbox.x < pipe.x + PIPE_WIDTH &&
                playerHitbox.x + playerHitbox.w > pipe.x
            ) {
                // We are within the horizontal area of the pipe
                // Check vertical collision (Top pipe OR Bottom pipe)
                if (
                    playerHitbox.y < pipe.topHeight || 
                    playerHitbox.y + playerHitbox.h > pipe.topHeight + PIPE_GAP
                ) {
                    if(player.isAlive){
                        killPlayer(gameState, playerId);
                    }
                }
            }
        }
    }
}

function updatePipes(gameState, width, height, pipeWidth, pipeGap) {
    // Spawn pipe every 100 frames (approx 1.5 seconds at 60fps)
    if (gameState.frameCount % 100 === 0) {
        // Random height for the TOP pipe
        const minPipe = 50;
        const maxPipe = height - pipeGap - minPipe;
        const topHeight = Math.floor(Math.random() * (maxPipe - minPipe + 1)) + minPipe;

        gameState.pipes.push({
            x: width,
            topHeight: topHeight, // The bottom Y coordinate of the top pipe
            scoredBy: {}
        });
    }

    // Move pipes
    for (const pipe of gameState.pipes) {
        pipe.x -= 3;
    }

    // Remove off-screen pipes
    gameState.pipes = gameState.pipes.filter(pipe => pipe.x + pipeWidth > 0);
}

function killPlayer(gameState, playerId) {
    const player = gameState.players[playerId];
    player.isAlive = false;
    
    delete gameState.players[playerId]; 
    console.log(`Game Over: ${player.username}`);

}

function getRandomColor() {
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5'];
    return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = 5500;
http.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});