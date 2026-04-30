const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const pelletsElement = document.getElementById("pellets");
const livesElement = document.getElementById("lives");

canvas.width = 1200;
canvas.height = 760;

const screenWidth = canvas.width;
const screenHeight = canvas.height;
const viewHeight = 600;
const bottomPanelTop = 600;
const horizon = 255;
const FOV = Math.PI / 2.15;

const map = [
    "1111111111111111111",
    "1000000000000000001",
    "1011110111110111101",
    "1010000100000100001",
    "1010111110111110101",
    "1010000000000000101",
    "1010110111110110101",
    "1000000100000100001",
    "1111110101110101111",
    "1000010000000100001",
    "1011110111110111101",
    "1000000000000000001",
    "1011110111110111101",
    "1010000100000100001",
    "1010111110111110101",
    "1010000000000000101",
    "1011110111110111101",
    "1000000000000000001",
    "1111111111111111111"
];

const mapRows = map.length;
const mapCols = map[0].length;

let score = 0;
let lives = 3;
let gameOver = false;
let isPaused = false;
let invulnerableTimer = 0;
let totalPellets = 0;
let eatenPellets = 0;

let playerHealth = 100;
const maxHealth = 100;
const ghostDamage = 25;

const damageTexts = [];

const input = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

const player = {
    x: 1.5,
    y: 1.5,
    angle: 0,
    radius: 0.18,
    baseMoveSpeed: 0.05,
    moveSpeed: 0.05,
    rotSpeed: 0.045
};

let speedBoostTimer = 0;
const speedBoostDuration = 420;

const bananaTotal = 2;
const drinkTotal = 2;
const pillTotal = 1;
let bananaCollected = 0;
let drinkCollected = 0;
let pillCollected = 0;

let bananas = [];
let energyDrinks = [];
let pills = [];

let edibleGhostTimer = 0;
const edibleGhostDuration = 60 * 30;

let walkSoundCooldown = 0;
let musicUnlocked = false;
let isSpeedMusicActive = false;

const centerGhostSpawns = [
    { x: 9.5, y: 9.5 },
    { x: 9.15, y: 9.5 },
    { x: 9.85, y: 9.5 },
    { x: 9.5, y: 9.15 },
    { x: 9.5, y: 9.85 }
];

const ghostInitials = [
    { color: "#ff2d3f", state: "CHASE", eye: "#3b2a2a" },
    { color: "#ff92f5", state: "PATROL", eye: "#2f2239" },
    { color: "#52ecff", state: "CHASE", eye: "#193549" },
    { color: "#ffb156", state: "PATROL", eye: "#4a3218" },
    { color: "#74ffb8", state: "SCATTER", eye: "#1c4735" }
];

const ghosts = ghostInitials.map((g, i) => ({
    x: centerGhostSpawns[i].x,
    y: centerGhostSpawns[i].y,
    color: g.color,
    baseColor: g.color,
    state: g.state,
    angle: 0,
    eye: g.eye,
    freezeTimer: 0
}));

const pellets = [];

/* =========================
   SOUND SYSTEM
========================= */
const sounds = {
    pellet: new Audio("assets/sounds/pellet.wav"),
    hit: new Audio("assets/sounds/hit.wav"),
    walk: new Audio("assets/sounds/walk.wav"),
    death: new Audio("assets/sounds/death.wav"),
    respawn: new Audio("assets/sounds/respawn.wav"),
    pause: new Audio("assets/sounds/pause.wav"),
    background: new Audio("assets/sounds/background.wav"),
    speed: new Audio("assets/sounds/speed.wav")
};

const redbullImage = new Image();
redbullImage.src = "assets/images/redbull.png";

for (const sound of Object.values(sounds)) {
    sound.preload = "auto";
}

sounds.walk.loop = false;
sounds.walk.volume = 0.18;
sounds.pellet.volume = 0.35;
sounds.hit.volume = 0.45;
sounds.death.volume = 0.55;
sounds.respawn.volume = 0.45;
sounds.pause.volume = 0.35;
sounds.background.loop = true;
sounds.background.volume = 0.16;
sounds.speed.loop = true;
sounds.speed.volume = 0.22;

function unlockAndStartMusic() {
    if (musicUnlocked) return;
    musicUnlocked = true;
    sounds.background.currentTime = 0;
    sounds.background.play().catch(() => {});
}

function updateMusicMode() {
    if (!musicUnlocked) return;

    if (gameOver || isPaused) {
        sounds.background.pause();
        sounds.speed.pause();
        return;
    }

    if (speedBoostTimer > 0) {
        if (!isSpeedMusicActive) {
            isSpeedMusicActive = true;
            sounds.background.pause();
            sounds.speed.currentTime = 0;
            sounds.speed.play().catch(() => {});
        }

        if (sounds.speed.paused) {
            sounds.speed.play().catch(() => {});
        }
    } else {
        if (isSpeedMusicActive) {
            isSpeedMusicActive = false;
            sounds.speed.pause();
            sounds.speed.currentTime = 0;
        }

        if (sounds.background.paused) {
            sounds.background.play().catch(() => {});
        }
    }
}

function playSound(name) {
    const original = sounds[name];
    if (!original) return;

    try {
        if (name === "walk") {
            original.currentTime = 0;
            original.play().catch(() => {});
        } else {
            const clone = original.cloneNode();
            clone.volume = original.volume;
            clone.play().catch(() => {});
        }
    } catch (error) {
        // ignore
    }
}

/* =========================
   INIT
========================= */
initializePellets();
spawnPowerUps();
updateHud();

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", clearInputState);
canvas.addEventListener("click", unlockAndStartMusic);

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    unlockAndStartMusic();

    if (["w", "a", "s", "d", "p", "r", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        e.preventDefault();
    }

    if (key === "w") input.forward = true;
    if (key === "s") input.backward = true;
    if (key === "a") input.left = true;
    if (key === "d") input.right = true;

    if (key === "r") {
        restartGame();
        return;
    }

    if (key === "p") {
        isPaused = !isPaused;
        clearInputState();
        playSound("pause");
        updateMusicMode();
    }
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();

    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        e.preventDefault();
    }

    if (key === "w") input.forward = false;
    if (key === "s") input.backward = false;
    if (key === "a") input.left = false;
    if (key === "d") input.right = false;
}

function clearInputState() {
    input.forward = false;
    input.backward = false;
    input.left = false;
    input.right = false;
}

function initializePellets() {
    totalPellets = 0;
    eatenPellets = 0;

    for (let row = 0; row < mapRows; row++) {
        pellets[row] = [];
        for (let col = 0; col < mapCols; col++) {
            const hasPellet = map[row][col] === "0";
            pellets[row][col] = hasPellet;
            if (hasPellet) totalPellets++;
        }
    }
}

function getOpenTiles() {
    const result = [];

    for (let row = 0; row < mapRows; row++) {
        for (let col = 0; col < mapCols; col++) {
            if (map[row][col] !== "1") {
                result.push({
                    x: col + 0.5,
                    y: row + 0.5,
                    key: `${col},${row}`
                });
            }
        }
    }

    return result;
}

function isNearReservedSpot(x, y, reserved) {
    for (const item of reserved) {
        if (Math.hypot(x - item.x, y - item.y) < 1.2) {
            return true;
        }
    }
    return false;
}

function getRandomSpawnTiles(count, reserved = []) {
    const openTiles = getOpenTiles().filter(tile => !isNearReservedSpot(tile.x, tile.y, reserved));
    const chosen = [];

    while (chosen.length < count && openTiles.length > 0) {
        const index = Math.floor(Math.random() * openTiles.length);
        const tile = openTiles.splice(index, 1)[0];
        chosen.push(tile);
    }

    return chosen;
}

function spawnPowerUps() {
    const reserved = [
        { x: player.x, y: player.y },
        ...centerGhostSpawns
    ];

    const bananaTiles = getRandomSpawnTiles(bananaTotal, reserved);
    const drinkReserved = reserved.concat(bananaTiles);
    const drinkTiles = getRandomSpawnTiles(drinkTotal, drinkReserved);
    const pillReserved = drinkReserved.concat(drinkTiles);
    const pillTiles = getRandomSpawnTiles(pillTotal, pillReserved);

    bananas = bananaTiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        active: true
    }));

    energyDrinks = drinkTiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        active: true
    }));

    pills = pillTiles.map(tile => ({
        x: tile.x,
        y: tile.y,
        active: true
    }));

    bananaCollected = 0;
    drinkCollected = 0;
    pillCollected = 0;
    edibleGhostTimer = 0;
}

function resetGhostsToCenter() {
    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].x = centerGhostSpawns[i].x;
        ghosts[i].y = centerGhostSpawns[i].y;
        ghosts[i].state = ghostInitials[i].state;
        ghosts[i].angle = 0;
        ghosts[i].color = ghosts[i].baseColor;
        ghosts[i].freezeTimer = 0;
    }
}

function restartGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    isPaused = false;
    invulnerableTimer = 0;
    playerHealth = 100;
    damageTexts.length = 0;
    speedBoostTimer = 0;
    edibleGhostTimer = 0;
    walkSoundCooldown = 0;
    player.moveSpeed = player.baseMoveSpeed;

    player.x = 1.5;
    player.y = 1.5;
    player.angle = 0;

    initializePellets();
    resetGhostsToCenter();
    spawnPowerUps();
    updateHud();
    clearInputState();
    isSpeedMusicActive = false;
    sounds.speed.pause();
    sounds.speed.currentTime = 0;
    if (musicUnlocked) {
        sounds.background.currentTime = 0;
        sounds.background.play().catch(() => {});
    }
    playSound("respawn");
}

function updateHud() {
    scoreElement.textContent = `${score}`;
    pelletsElement.textContent = `${eatenPellets}/${totalPellets}`;
    livesElement.textContent = `${lives}`;
}

function isWall(x, y) {
    const col = Math.floor(x);
    const row = Math.floor(y);

    if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) {
        return true;
    }

    return map[row][col] === "1";
}

function tryMove(newX, newY) {
    if (!isWall(newX, player.y)) {
        player.x = newX;
    }

    if (!isWall(player.x, newY)) {
        player.y = newY;
    }
}

function updatePlayer() {
    if (gameOver || isPaused) return;

    if (speedBoostTimer > 0) {
        speedBoostTimer--;
        player.moveSpeed = 0.08;
    } else {
        player.moveSpeed = player.baseMoveSpeed;
    }

    if (input.left) {
        player.angle -= player.rotSpeed;
    }

    if (input.right) {
        player.angle += player.rotSpeed;
    }

    let moveStep = 0;

    if (input.forward) {
        moveStep = player.moveSpeed;
    }

    if (input.backward) {
        moveStep = -player.moveSpeed;
    }

    if (moveStep !== 0) {
        const nextX = player.x + Math.cos(player.angle) * moveStep;
        const nextY = player.y + Math.sin(player.angle) * moveStep;
        tryMove(nextX, nextY);

        if (walkSoundCooldown <= 0) {
            playSound("walk");
            walkSoundCooldown = 12;
        }
    }

    if (walkSoundCooldown > 0) {
        walkSoundCooldown--;
    }

    eatPellet();
    collectPowerUps();
}

function eatPellet() {
    const col = Math.floor(player.x);
    const row = Math.floor(player.y);

    if (row >= 0 && row < mapRows && col >= 0 && col < mapCols && pellets[row][col]) {
        pellets[row][col] = false;
        score += 10;
        eatenPellets++;
        updateHud();
        playSound("pellet");
    }
}

function collectPowerUps() {
    for (const banana of bananas) {
        if (banana.active && Math.hypot(player.x - banana.x, player.y - banana.y) < 0.38) {
            banana.active = false;
            bananaCollected++;
            resetGhostsToCenter();
            playSound("respawn");
        }
    }

    for (const drink of energyDrinks) {
        if (drink.active && Math.hypot(player.x - drink.x, player.y - drink.y) < 0.38) {
            drink.active = false;
            drinkCollected++;
            playerHealth = Math.min(maxHealth, playerHealth + 10);
            speedBoostTimer = speedBoostDuration;
            playSound("respawn");
            updateMusicMode();
        }
    }

    for (const pill of pills) {
        if (pill.active && Math.hypot(player.x - pill.x, player.y - pill.y) < 0.38) {
            pill.active = false;
            pillCollected++;
            edibleGhostTimer = edibleGhostDuration;
            playSound("respawn");
        }
    }
}

function distance(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
}

function getAvailableGhostDirections(ghost) {
    const dirs = [
        { x: 1, y: 0, angle: 0 },
        { x: -1, y: 0, angle: Math.PI },
        { x: 0, y: 1, angle: Math.PI / 2 },
        { x: 0, y: -1, angle: -Math.PI / 2 }
    ];

    return dirs.filter(dir => {
        const testX = ghost.x + dir.x * 0.25;
        const testY = ghost.y + dir.y * 0.25;
        return !isWall(testX, testY);
    });
}

function updateGhostStates() {
    for (const ghost of ghosts) {
        if (edibleGhostTimer > 0) {
            ghost.state = "FRIGHTENED";
            continue;
        }

        const d = distance(ghost.x, ghost.y, player.x, player.y);

        if (d < 4.3) {
            ghost.state = "CHASE";
        } else if (d > 7.5) {
            ghost.state = "PATROL";
        } else {
            ghost.state = "SCATTER";
        }
    }
}

function updateGhosts() {
    if (gameOver || isPaused) return;

    updateGhostStates();

    for (const ghost of ghosts) {
        if (ghost.freezeTimer > 0) {
            ghost.freezeTimer--;
            continue;
        }

        const options = getAvailableGhostDirections(ghost);
        if (options.length === 0) continue;

        let chosen = options[0];

        if (ghost.state === "FRIGHTENED") {
            let bestDist = -Infinity;
            for (const dir of options) {
                const nx = ghost.x + dir.x * 0.24;
                const ny = ghost.y + dir.y * 0.24;
                const d = distance(nx, ny, player.x, player.y);
                if (d > bestDist) {
                    bestDist = d;
                    chosen = dir;
                }
            }
        } else if (ghost.state === "CHASE") {
            let bestDist = Infinity;
            for (const dir of options) {
                const nx = ghost.x + dir.x * 0.24;
                const ny = ghost.y + dir.y * 0.24;
                const d = distance(nx, ny, player.x, player.y);
                if (d < bestDist) {
                    bestDist = d;
                    chosen = dir;
                }
            }
        } else if (ghost.state === "SCATTER") {
            const target = { x: mapCols - 2, y: 1.5 };
            let bestDist = Infinity;
            for (const dir of options) {
                const nx = ghost.x + dir.x * 0.24;
                const ny = ghost.y + dir.y * 0.24;
                const d = distance(nx, ny, target.x, target.y);
                if (d < bestDist) {
                    bestDist = d;
                    chosen = dir;
                }
            }
        } else {
            if (Math.random() < 0.09) {
                chosen = options[Math.floor(Math.random() * options.length)];
            } else {
                let best = null;
                let bestAlign = -Infinity;

                for (const dir of options) {
                    const align = Math.cos(ghost.angle - dir.angle);
                    if (align > bestAlign) {
                        bestAlign = align;
                        best = dir;
                    }
                }

                if (best) chosen = best;
            }
        }

        ghost.angle = chosen.angle;

        const speed = ghost.state === "FRIGHTENED" ? 0.018 : (ghost.state === "CHASE" ? 0.031 : 0.021);
        const nx = ghost.x + Math.cos(ghost.angle) * speed;
        const ny = ghost.y + Math.sin(ghost.angle) * speed;

        if (!isWall(nx, ghost.y)) ghost.x = nx;
        if (!isWall(ghost.x, ny)) ghost.y = ny;

        if (distance(ghost.x, ghost.y, player.x, player.y) < 0.34) {
            if (edibleGhostTimer > 0) {
                eatGhost(ghost);
            } else if (invulnerableTimer <= 0) {
                damagePlayer(ghostDamage, ghost);
            }
            return;
        }
    }
}


function resetSingleGhostToCenter(ghost) {
    const index = ghosts.indexOf(ghost);
    const spawn = centerGhostSpawns[index >= 0 ? index : 0];
    const initial = ghostInitials[index >= 0 ? index : 0];

    ghost.x = spawn.x;
    ghost.y = spawn.y;
    ghost.state = initial.state;
    ghost.angle = 0;
    ghost.color = ghost.baseColor;
    ghost.freezeTimer = 90;
}

function eatGhost(ghost) {
    playerHealth = maxHealth;
    score += 200;
    updateHud();

    damageTexts.push({
        text: "+200 +FULL HP",
        x: screenWidth / 2,
        y: viewHeight - 90,
        opacity: 1,
        life: 60
    });

    resetSingleGhostToCenter(ghost);
    playSound("respawn");
}

function damagePlayer(amount, attackingGhost = null) {
    if (attackingGhost) {
        attackingGhost.freezeTimer = 90;
    }

    playerHealth -= amount;
    invulnerableTimer = 120;

    damageTexts.push({
        text: `-${amount}`,
        x: screenWidth / 2,
        y: viewHeight - 70,
        opacity: 1,
        life: 45
    });

    playSound("hit");

    if (playerHealth <= 0) {
        lives--;
        playerHealth = maxHealth;
        updateHud();
        resetGhostsToCenter();
        playSound("death");

        if (lives <= 0) {
            gameOver = true;
            updateMusicMode();
            return;
        }

        player.x = 1.5;
        player.y = 1.5;
        player.angle = 0;
        playSound("respawn");
    }
}

function updateDamageTexts() {
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        const item = damageTexts[i];
        item.y -= 1.1;
        item.life--;
        item.opacity = Math.max(0, item.life / 45);

        if (item.life <= 0) {
            damageTexts.splice(i, 1);
        }
    }
}

function castRay(rayAngle) {
    let dist = 0;
    const step = 0.012;

    while (dist < 24) {
        const testX = player.x + Math.cos(rayAngle) * dist;
        const testY = player.y + Math.sin(rayAngle) * dist;

        if (isWall(testX, testY)) {
            return dist;
        }

        dist += step;
    }

    return 24;
}

function normalizeAngle(a) {
    while (a < -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#0e1d4a");
    sky.addColorStop(0.55, "#07102b");
    sky.addColorStop(1, "#040812");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, screenWidth, horizon);

    for (let i = 0; i < 40; i++) {
        const x = (i * 173) % screenWidth;
        const y = 20 + ((i * 97) % 140);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(x, y, 2, 2);
    }

    const floor = ctx.createLinearGradient(0, horizon, 0, viewHeight);
    floor.addColorStop(0, "#1b223b");
    floor.addColorStop(0.4, "#10172b");
    floor.addColorStop(1, "#060a12");
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, screenWidth, viewHeight - horizon);
}

function draw3DView() {
    drawBackground();

    const numRays = screenWidth;
    const depthBuffer = new Array(numRays);

    for (let i = 0; i < numRays; i++) {
        const rayAngle = player.angle - FOV / 2 + (i / numRays) * FOV;
        const dist = castRay(rayAngle);

        const correctedDist = dist * Math.cos(rayAngle - player.angle);
        depthBuffer[i] = correctedDist;

        const wallHeight = Math.min(620, 980 / (correctedDist + 0.0001));
        const wallTop = horizon - wallHeight / 2;
        const wallBottom = wallTop + wallHeight;

        const glow = Math.max(35, 255 - correctedDist * 40);
        const core = Math.max(10, 120 - correctedDist * 10);

        ctx.fillStyle = `rgb(${core * 0.2}, ${glow * 0.95}, ${Math.min(255, glow + 30)})`;
        ctx.fillRect(i, wallTop, 1.6, wallHeight);

        ctx.fillStyle = `rgba(155,245,255,${Math.max(0, 0.14 - correctedDist * 0.012)})`;
        ctx.fillRect(i, wallTop, 1.6, 4);

        ctx.fillStyle = `rgba(255,0,214,${Math.max(0, 0.12 - correctedDist * 0.01)})`;
        ctx.fillRect(i, wallBottom - 4, 1.6, 4);
    }

    drawVisiblePelletPath(depthBuffer);
    drawPowerUps3D(depthBuffer);
    drawGhostsIn3D(depthBuffer);

    const vignette = ctx.createRadialGradient(
        screenWidth / 2,
        horizon + 90,
        120,
        screenWidth / 2,
        horizon + 100,
        820
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.48)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, screenWidth, viewHeight);

    if (speedBoostTimer > 0) {
        drawSpeedBoostEffect();
    }
}

function drawVisiblePelletPath(depthBuffer) {
    const sprites = [];

    for (let row = 0; row < mapRows; row++) {
        for (let col = 0; col < mapCols; col++) {
            if (!pellets[row][col]) continue;

            const worldX = col + 0.5;
            const worldY = row + 0.5;

            const dx = worldX - player.x;
            const dy = worldY - player.y;
            const dist = Math.hypot(dx, dy);
            const angleTo = Math.atan2(dy, dx);
            const rel = normalizeAngle(angleTo - player.angle);

            if (Math.abs(rel) < FOV / 2 + 0.55 && dist > 0.2 && dist < 20) {
                sprites.push({ x: worldX, y: worldY, dist, rel });
            }
        }
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (const pellet of sprites) {
        const centerX = screenWidth / 2 + (pellet.rel / (FOV / 2)) * (screenWidth / 2);
        const size = Math.max(5, 105 / (pellet.dist + 0.22));
        const baseY = horizon + 160 + 120 / (pellet.dist + 0.35);

        const left = Math.floor(centerX - size * 2.2);
        const right = Math.floor(centerX + size * 2.2);

        let visible = false;
        for (let x = left; x <= right; x++) {
            if (x >= 0 && x < screenWidth && pellet.dist < depthBuffer[x] + 0.12) {
                visible = true;
                break;
            }
        }

        if (!visible) continue;

        ctx.strokeStyle = "rgba(255,220,120,0.22)";
        ctx.lineWidth = Math.max(1, size * 0.16);
        ctx.beginPath();
        ctx.moveTo(centerX, baseY + size * 0.3);
        ctx.lineTo(centerX, baseY + size * 1.8);
        ctx.stroke();

        const glow = ctx.createRadialGradient(centerX, baseY, 1, centerX, baseY, size * 2.4);
        glow.addColorStop(0, "rgba(255,255,235,1)");
        glow.addColorStop(0.3, "rgba(255,244,185,0.95)");
        glow.addColorStop(0.65, "rgba(255,218,100,0.52)");
        glow.addColorStop(1, "rgba(255,214,90,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, baseY, size * 2.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#fff9d6";
        ctx.beginPath();
        ctx.arc(centerX, baseY, size * 0.66, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPowerUps3D(depthBuffer) {
    const items = [];

    for (const banana of bananas) {
        if (!banana.active) continue;
        const dx = banana.x - player.x;
        const dy = banana.y - player.y;
        const dist = Math.hypot(dx, dy);
        const rel = normalizeAngle(Math.atan2(dy, dx) - player.angle);

        if (Math.abs(rel) < FOV / 2 + 0.25 && dist < 18) {
            items.push({ type: "banana", x: banana.x, y: banana.y, dist, rel });
        }
    }

    for (const drink of energyDrinks) {
        if (!drink.active) continue;
        const dx = drink.x - player.x;
        const dy = drink.y - player.y;
        const dist = Math.hypot(dx, dy);
        const rel = normalizeAngle(Math.atan2(dy, dx) - player.angle);

        if (Math.abs(rel) < FOV / 2 + 0.25 && dist < 18) {
            items.push({ type: "drink", x: drink.x, y: drink.y, dist, rel });
        }
    }

    for (const pill of pills) {
        if (!pill.active) continue;
        const dx = pill.x - player.x;
        const dy = pill.y - player.y;
        const dist = Math.hypot(dx, dy);
        const rel = normalizeAngle(Math.atan2(dy, dx) - player.angle);

        if (Math.abs(rel) < FOV / 2 + 0.25 && dist < 18) {
            items.push({ type: "pill", x: pill.x, y: pill.y, dist, rel });
        }
    }

    items.sort((a, b) => b.dist - a.dist);

    for (const item of items) {
        const centerX = screenWidth / 2 + (item.rel / (FOV / 2)) * (screenWidth / 2);
        const size = Math.min(180, 220 / (item.dist + 0.15));
        const y = horizon + 130 - size / 2 + 72 / (item.dist + 0.4);

        const left = Math.floor(centerX - size / 2);
        const right = Math.floor(centerX + size / 2);

        let visible = false;
        for (let x = left; x <= right; x++) {
            if (x >= 0 && x < screenWidth && item.dist < depthBuffer[x] + 0.06) {
                visible = true;
                break;
            }
        }

        if (!visible) continue;

        if (item.type === "banana") {
            drawBananaSprite(centerX, y, size);
        } else if (item.type === "drink") {
            drawDrinkSprite(centerX, y, size);
        } else {
            drawPillSprite(centerX, y, size);
        }
    }
}

function drawBananaSprite(x, y, size) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = "#ffe86d";
    ctx.shadowBlur = 20;

    ctx.lineWidth = Math.max(4, size * 0.08);
    ctx.strokeStyle = "#ffd93a";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.38, 0.8, 2.4);
    ctx.stroke();

    ctx.strokeStyle = "#fff2a1";
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.beginPath();
    ctx.arc(3, -2, size * 0.28, 0.85, 2.3);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawDrinkSprite(x, y, size) {
    ctx.save();
    ctx.translate(x, y);

    const w = size * 0.42;
    const h = size * 0.86;

    ctx.shadowColor = "#51eaff";
    ctx.shadowBlur = 22;

    if (redbullImage.complete && redbullImage.naturalWidth > 0) {
        ctx.drawImage(redbullImage, -w / 2, -h / 2, w, h);
    } else {
        const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        grad.addColorStop(0, "#f5ffff");
        grad.addColorStop(0.32, "#245dff");
        grad.addColorStop(0.34, "#ffffff");
        grad.addColorStop(0.64, "#f44336");
        grad.addColorStop(1, "#171717");

        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);

        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.max(8, size * 0.08)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("RB", 0, 0);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
}


function drawPillSprite(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);

    const w = size * 0.7;
    const h = size * 0.28;

    ctx.shadowColor = "#243bff";
    ctx.shadowBlur = 24;

    ctx.fillStyle = "#1626a8";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
    ctx.fill();

    ctx.fillStyle = "#dfe5ff";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w / 2, h, h / 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = Math.max(1, size * 0.025);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGhostsIn3D(depthBuffer) {
    const visible = [];

    for (const ghost of ghosts) {
        const dx = ghost.x - player.x;
        const dy = ghost.y - player.y;
        const dist = Math.hypot(dx, dy);

        const angleToGhost = Math.atan2(dy, dx);
        const relativeAngle = normalizeAngle(angleToGhost - player.angle);

        if (Math.abs(relativeAngle) < FOV / 2 + 0.25 && dist < 16) {
            visible.push({ ghost, dist, relativeAngle });
        }
    }

    visible.sort((a, b) => b.dist - a.dist);

    for (const item of visible) {
        const ghost = item.ghost;
        const dist = item.dist;
        const centerX = screenWidth / 2 + (item.relativeAngle / (FOV / 2)) * (screenWidth / 2);

        const size = Math.min(420, 520 / (dist + 0.1));
        const y = horizon + 50 - size / 2 + 36 / (dist + 0.4);

        const spriteWidth = size * 0.82;
        const left = Math.floor(centerX - spriteWidth / 2);
        const right = Math.floor(centerX + spriteWidth / 2);

        let anyVisible = false;
        for (let x = left; x <= right; x++) {
            if (x >= 0 && x < screenWidth && dist < depthBuffer[x] + 0.04) {
                anyVisible = true;
                break;
            }
        }

        if (!anyVisible) continue;

        drawGhostBillboard(centerX, y, size, ghost, dist);
    }
}

function drawGhostBillboard(centerX, y, size, ghost, dist) {
    const w = size * 0.78;
    const h = size;

    const bodyColor = edibleGhostTimer > 0 ? "#071a78" : ghost.color;
    const glowAlpha = Math.max(0.08, 0.26 - dist * 0.02);

    const grad = ctx.createRadialGradient(centerX, y + h * 0.2, h * 0.08, centerX, y + h * 0.3, h * 0.9);
    grad.addColorStop(0, lighten(bodyColor, 60));
    grad.addColorStop(0.4, bodyColor);
    grad.addColorStop(1, darken(bodyColor, 70));

    ctx.save();

    ctx.beginPath();
    ctx.arc(centerX, y + h * 0.28, w * 0.33, Math.PI, 0);
    ctx.lineTo(centerX + w * 0.33, y + h * 0.78);
    ctx.lineTo(centerX + w * 0.22, y + h * 0.69);
    ctx.lineTo(centerX + w * 0.08, y + h * 0.82);
    ctx.lineTo(centerX - w * 0.05, y + h * 0.69);
    ctx.lineTo(centerX - w * 0.18, y + h * 0.82);
    ctx.lineTo(centerX - w * 0.32, y + h * 0.7);
    ctx.lineTo(centerX - w * 0.33, y + h * 0.78);
    ctx.closePath();

    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(centerX, y + h * 0.26, w * 0.17, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    const eyeY = y + h * 0.29;
    const eyeOffset = w * 0.16;
    const eyeR = w * 0.12;

    ctx.fillStyle = "#f6f8ff";
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(centerX + eyeOffset, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ghost.eye;
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset + eyeR * 0.12, eyeY + eyeR * 0.1, eyeR * 0.48, 0, Math.PI * 2);
    ctx.arc(centerX + eyeOffset + eyeR * 0.12, eyeY + eyeR * 0.1, eyeR * 0.48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset - eyeR * 0.18, eyeY - eyeR * 0.18, eyeR * 0.18, 0, Math.PI * 2);
    ctx.arc(centerX + eyeOffset - eyeR * 0.18, eyeY - eyeR * 0.18, eyeR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${clamp(rgb.r + amount)}, ${clamp(rgb.g + amount)}, ${clamp(rgb.b + amount)})`;
}

function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    return `rgb(${clamp(rgb.r - amount)}, ${clamp(rgb.g - amount)}, ${clamp(rgb.b - amount)})`;
}

function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}

function clamp(v) {
    return Math.max(0, Math.min(255, v));
}

function drawBottomPanel() {
    ctx.fillStyle = "rgba(4, 8, 16, 0.94)";
    ctx.fillRect(0, bottomPanelTop, screenWidth, screenHeight - bottomPanelTop);

    const line = ctx.createLinearGradient(0, bottomPanelTop, screenWidth, bottomPanelTop);
    line.addColorStop(0, "rgba(255, 0, 170, 0)");
    line.addColorStop(0.5, "rgba(255, 0, 170, 0.7)");
    line.addColorStop(1, "rgba(255, 0, 170, 0)");
    ctx.fillStyle = line;
    ctx.fillRect(0, bottomPanelTop, screenWidth, 2);

    drawLifeIcons(24, bottomPanelTop + 36);
    drawHealthBar(screenWidth / 2 - 170, bottomPanelTop + 20, 240, 24);
    drawPowerUpCounters(screenWidth / 2 - 170, bottomPanelTop + 52);
}

function drawLifeIcons(x, y) {
    for (let i = 0; i < lives; i++) {
        drawPacIcon(x + i * 34, y, 13);
    }
}

function drawPacIcon(x, y, r) {
    ctx.fillStyle = "#ffe55c";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0.35, Math.PI * 2 - 0.35);
    ctx.closePath();
    ctx.fill();
}

function drawHealthBar(x, y, width, height) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = "rgba(180,220,255,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    const percent = Math.max(0, playerHealth / maxHealth);
    const fillWidth = width * percent;

    const grad = ctx.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, "#26ff7a");
    grad.addColorStop(0.5, "#c8ff4d");
    grad.addColorStop(1, "#ff4d4d");

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, fillWidth, height);

    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`HP ${playerHealth}/${maxHealth}`, x + width / 2, y + 17);
}

function drawPowerUpCounters(x, y) {
    ctx.textAlign = "left";
    ctx.font = "14px Arial";

    ctx.fillStyle = "#ffe56a";
    ctx.fillText(`Bananas: ${bananaCollected}/${bananaTotal}`, x, y);

    ctx.fillStyle = "#6fe8ff";
    ctx.fillText(`Energy Drinks: ${drinkCollected}/${drinkTotal}`, x, y + 20);

    ctx.fillStyle = "#b9c4ff";
    ctx.fillText(`Ghost Pills: ${pillCollected}/${pillTotal}`, x, y + 40);

    if (edibleGhostTimer > 0) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`Ghost Eat Time: ${Math.ceil(edibleGhostTimer / 60)}s`, x + 155, y + 40);
    }
}

function drawMiniMap() {
    const miniWidth = 145;
    const miniHeight = 145;
    const miniX = screenWidth - miniWidth - 22;
    const miniY = bottomPanelTop + 8;

    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect(miniX, miniY, miniWidth, miniHeight);

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(miniX, miniY, miniWidth, miniHeight);

    const scaleX = miniWidth / mapCols;
    const scaleY = miniHeight / mapRows;

    for (let row = 0; row < mapRows; row++) {
        for (let col = 0; col < mapCols; col++) {
            const x = miniX + col * scaleX;
            const y = miniY + row * scaleY;

            if (map[row][col] === "1") {
                ctx.fillStyle = "#f4f7ff";
                ctx.fillRect(x, y, scaleX, scaleY);
            } else if (pellets[row][col]) {
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.fillRect(x + scaleX * 0.44, y + scaleY * 0.44, 2, 2);
            }
        }
    }

    for (const banana of bananas) {
        if (!banana.active) continue;
        ctx.fillStyle = "#ffe56a";
        ctx.beginPath();
        ctx.arc(miniX + banana.x * scaleX, miniY + banana.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const drink of energyDrinks) {
        if (!drink.active) continue;
        ctx.fillStyle = "#51eaff";
        ctx.beginPath();
        ctx.arc(miniX + drink.x * scaleX, miniY + drink.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const pill of pills) {
        if (!pill.active) continue;
        ctx.fillStyle = "#273cff";
        ctx.beginPath();
        ctx.arc(miniX + pill.x * scaleX, miniY + pill.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    for (const ghost of ghosts) {
        ctx.fillStyle = edibleGhostTimer > 0 ? "#071a78" : ghost.color;
        ctx.beginPath();
        ctx.arc(miniX + ghost.x * scaleX, miniY + ghost.y * scaleY, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    const px = miniX + player.x * scaleX;
    const py = miniY + player.y * scaleY;
    ctx.fillStyle = "#ffe55c";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffe55c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.angle) * 12, py + Math.sin(player.angle) * 12);
    ctx.stroke();

    ctx.fillStyle = "#cde8ff";
    ctx.font = "12px Arial";
    ctx.textAlign = "left";
    ctx.fillText("MINIMAP", miniX, miniY - 8);
}

function drawDamageOverlay() {
    if (invulnerableTimer <= 0) return;

    const alpha = 0.16 + Math.sin(invulnerableTimer * 0.4) * 0.06;
    ctx.fillStyle = `rgba(255, 60, 60, ${alpha})`;
    ctx.fillRect(0, 0, screenWidth, viewHeight);
}

function drawDamageTexts() {
    for (const item of damageTexts) {
        ctx.save();
        ctx.globalAlpha = item.opacity;
        ctx.fillStyle = "#ff5b5b";
        ctx.font = "bold 34px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.text, item.x, item.y);
        ctx.restore();
    }
}

function drawSpeedBoostEffect() {
    ctx.save();
    ctx.globalAlpha = 0.22;

    for (let i = 0; i < 10; i++) {
        const x = (i * 137 + speedBoostTimer * 7) % screenWidth;
        const grad = ctx.createLinearGradient(x, 0, x + 60, 0);
        grad.addColorStop(0, "rgba(80,230,255,0)");
        grad.addColorStop(0.5, "rgba(80,230,255,0.7)");
        grad.addColorStop(1, "rgba(80,230,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, 60, viewHeight);
    }

    ctx.restore();
}

function drawPauseOverlay() {
    if (!isPaused) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", screenWidth / 2, 240);

    ctx.font = "20px Arial";
    ctx.fillText("Press P to continue", screenWidth / 2, 280);
}

function drawCrosshair() {
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenWidth / 2 - 10, horizon);
    ctx.lineTo(screenWidth / 2 + 10, horizon);
    ctx.moveTo(screenWidth / 2, horizon - 10);
    ctx.lineTo(screenWidth / 2, horizon + 10);
    ctx.stroke();
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    ctx.fillStyle = "#ff5c72";
    ctx.font = "46px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", screenWidth / 2, 220);

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Press R to restart", screenWidth / 2, 265);
}

function update() {
    if (gameOver || isPaused) return;

    if (invulnerableTimer > 0) {
        invulnerableTimer--;
    }

    if (edibleGhostTimer > 0) {
        edibleGhostTimer--;
    }

    updatePlayer();
    updateGhosts();
    updateDamageTexts();
    updateMusicMode();
}

function draw() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);

    draw3DView();
    drawBottomPanel();
    drawMiniMap();
    drawCrosshair();
    drawDamageOverlay();
    drawDamageTexts();

    if (isPaused) {
        drawPauseOverlay();
    }

    if (gameOver) {
        drawGameOver();
    }
}

function gameLoop() {
    if (!gameOver && !isPaused) {
        update();
    } else {
        updateDamageTexts();
    }

    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();