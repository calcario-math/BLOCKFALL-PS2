
// ===================================
// BLOCKFALL PS2 - VERSAO 1.0
// AthenaEnv - PlayStation 2
// ===================================

const W = 10;
const H = 20;
const CELL = 19;

const BX = 205;
const BY = 32;

const font = new Font("default");
const pad = Pads.get(0);

function rgb(r, g, b) {
    return Color.new(r, g, b, 128);
}

const C = {
    bg: rgb(8, 12, 28),
    panel: rgb(18, 25, 49),
    grid: rgb(36, 45, 68),
    white: rgb(240, 245, 255),
    gray: rgb(125, 140, 165),
    cyan: rgb(0, 220, 240),
    yellow: rgb(250, 210, 30),
    purple: rgb(165, 65, 230),
    green: rgb(40, 215, 90),
    red: rgb(240, 65, 75),
    blue: rgb(55, 95, 240),
    orange: rgb(250, 145, 35),
    ghost: rgb(65, 75, 95)
};

const COLORS = [
    C.bg, C.cyan, C.yellow,
    C.purple, C.green, C.red,
    C.blue, C.orange
];

const SHAPES = [
    [[1,1,1,1]],

    [[2,2],
     [2,2]],

    [[0,3,0],
     [3,3,3]],

    [[0,4,4],
     [4,4,0]],

    [[5,5,0],
     [0,5,5]],

    [[6,0,0],
     [6,6,6]],

    [[0,0,7],
     [7,7,7]]
];

// ESTADOS
const MENU = 0;
const PLAYING = 1;
const PAUSED = 2;
const GAMEOVER = 3;

let state = PLAYING;

let board = [];
let piece = null;
let nextPiece = null;

let score = 0;
let lines = 0;
let level = 1;
let best = 0;

let fallTime = 0;
let lastTime = Date.now();

let heldDir = 0;
let repeatAt = 0;

// ===================================
// LOGICA DO JOGO
// ===================================

function emptyBoard() {
    let b = [];

    for (let y = 0; y < H; y++) {
        b.push(new Array(W).fill(0));
    }

    return b;
}

function randomPiece() {
    let id = Math.floor(Math.random() * 7);

    return {
        shape: SHAPES[id].map(r => r.slice()),
        x: 3,
        y: 0
    };
}

function collision(p, dx, dy, shape) {
    let s = shape || p.shape;

    for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {

            if (!s[y][x]) continue;

            let nx = p.x + x + dx;
            let ny = p.y + y + dy;

            if (nx < 0 || nx >= W || ny >= H) {
                return true;
            }

            if (ny >= 0 && board[ny][nx]) {
                return true;
            }
        }
    }

    return false;
}

function spawn() {
    piece = nextPiece;

    piece.x = Math.floor(
        (W - piece.shape[0].length) / 2
    );

    piece.y = 0;

    nextPiece = randomPiece();

    if (collision(piece, 0, 0)) {
        state = GAMEOVER;

        if (score > best) {
            best = score;
        }
    }
}

function newGame() {
    board = emptyBoard();

    score = 0;
    lines = 0;
    level = 1;

    fallTime = 0;
    heldDir = 0;
    repeatAt = 0;

    nextPiece = randomPiece();

    state = PLAYING;

    spawn();

    lastTime = Date.now();
}

function move(dx, dy) {
    if (!collision(piece, dx, dy)) {
        piece.x += dx;
        piece.y += dy;
        return true;
    }

    return false;
}

function rotate() {
    let old = piece.shape;

    let rotated = old[0].map((_, x) =>
        old.map(row => row[x]).reverse()
    );

    let offsets = [0, -1, 1, -2, 2];

    for (let i = 0; i < offsets.length; i++) {
        if (!collision(piece, offsets[i], 0, rotated)) {
            piece.x += offsets[i];
            piece.shape = rotated;
            return;
        }
    }
}

function clearLines() {
    let removed = 0;

    for (let y = H - 1; y >= 0; y--) {
        if (board[y].every(v => v !== 0)) {
            board.splice(y, 1);
            board.unshift(new Array(W).fill(0));

            removed++;
            y++;
        }
    }

    if (removed > 0) {
        const points = [0, 100, 300, 500, 800];

        score += points[removed] * level;
        lines += removed;

        level = 1 + Math.floor(lines / 10);
    }
}

function lockPiece() {
    let s = piece.shape;

    for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {

            if (!s[y][x]) continue;

            let py = piece.y + y;
            let px = piece.x + x;

            if (py < 0) {
                state = GAMEOVER;
                if (score > best) best = score;
                return;
            }

            board[py][px] = s[y][x];
        }
    }

    clearLines();
    spawn();

    fallTime = 0;
}

function stepDown() {
    if (!move(0, 1)) {
        lockPiece();
    }
}

function hardDrop() {
    let distance = 0;

    while (move(0, 1)) {
        distance++;
    }

    score += distance * 2;

    lockPiece();
}

// ===================================
// PECA FANTASMA
// ===================================

function ghostY() {
    let distance = 0;

    while (!collision(piece, 0, distance + 1)) {
        distance++;
    }

    return piece.y + distance;
}

// ===================================
// CONTROLE
// ===================================

function handleInput(now) {
    pad.update();

    if (state === MENU) {
        if (pad.justPressed(Pads.START) ||
            pad.justPressed(Pads.CROSS)) {
            newGame();
        }
        return;
    }

    if (state === GAMEOVER) {
        if (pad.justPressed(Pads.START)) {
            newGame();
        }
        return;
    }

    if (pad.justPressed(Pads.START)) {
        if (state === PAUSED) {
            state = PLAYING;
            lastTime = now;
        } else {
            state = PAUSED;
        }

        heldDir = 0;
        return;
    }

    if (state !== PLAYING) return;

    let dir = 0;

    if (pad.pressed(Pads.LEFT)) {
        dir = -1;
    } else if (pad.pressed(Pads.RIGHT)) {
        dir = 1;
    }

    if (dir === 0) {
        heldDir = 0;
    } else if (dir !== heldDir) {
        move(dir, 0);
        heldDir = dir;
        repeatAt = now + 300;
    } else if (now >= repeatAt) {
        move(dir, 0);
        repeatAt = now + 150;
    }

    if (pad.justPressed(Pads.CROSS)) {
        rotate();
    }

    if (pad.justPressed(Pads.CIRCLE)) {
        hardDrop();
        return;
    }

    if (pad.justPressed(Pads.DOWN)) {
        if (move(0, 1)) {
            score++;
        }
    }
}

// ===================================
// DESENHO
// ===================================

function print(x, y, text, color) {
    font.color = color;
    font.print(x, y, String(text));
}

function block(x, y, id, size) {
    if (!id) return;

    Draw.rect(
        x, y,
        size - 1, size - 1,
        COLORS[id]
    );

    Draw.rect(
        x + 2, y + 2,
        size - 5, 2,
        C.white
    );
}

function drawBoard() {
    // Moldura
    Draw.rect(
        BX - 5, BY - 5,
        W * CELL + 10,
        H * CELL + 10,
        C.cyan
    );

    Draw.rect(
        BX - 2, BY - 2,
        W * CELL + 4,
        H * CELL + 4,
        C.panel
    );

    // Tabuleiro
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let px = BX + x * CELL;
            let py = BY + y * CELL;

            Draw.rect(
                px, py,
                CELL - 1, CELL - 1,
                C.grid
            );

            if (board[y][x]) {
                block(px, py, board[y][x], CELL);
            }
        }
    }

    if (state === GAMEOVER) return;

    // Fantasma
    let gy = ghostY();

    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {

            if (!piece.shape[y][x]) continue;

            Draw.rect(
                BX + (piece.x + x) * CELL + 3,
                BY + (gy + y) * CELL + 3,
                CELL - 7,
                CELL - 7,
                C.ghost
            );
        }
    }

    // Peca atual
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {

            let id = piece.shape[y][x];

            if (id) {
                block(
                    BX + (piece.x + x) * CELL,
                    BY + (piece.y + y) * CELL,
                    id,
                    CELL
                );
            }
        }
    }
}

function drawUI() {
    print(20, 15, "BLOCKFALL 2.0", C.cyan);

    print(30, 65, "SCORE", C.white);
    print(30, 90, score, C.yellow);

    print(30, 145, "LEVEL", C.white);
    print(30, 170, level, C.cyan);

    print(30, 225, "LINES", C.white);
    print(30, 250, lines, C.green);

    print(425, 65, "NEXT", C.white);

    Draw.rect(420, 90, 125, 100, C.panel);

    let s = nextPiece.shape;

    for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {
            if (s[y][x]) {
                block(
                    435 + x * 18,
                    115 + y * 18,
                    s[y][x],
                    18
                );
            }
        }
    }

    print(420, 225, "X: ROTATE", C.gray);
    print(420, 250, "O: DROP", C.gray);
    print(420, 275, "DOWN: FAST", C.gray);
    print(420, 300, "START: PAUSE", C.gray);

    print(20, 425, "ATHENAENV EDITION", C.cyan);
}

function drawMenu() {
    print(200, 95, "BLOCKFALL", C.cyan);
    print(245, 130, "PS2", C.yellow);

    Draw.rect(155, 190, 330, 105, C.panel);

    print(205, 205, "PRESS START", C.white);
    print(205, 245, "TO PLAY", C.green);

    print(185, 340, "ATHENAENV EDITION", C.gray);
    print(215, 380, "VERSION 2.0", C.cyan);
}

function drawOverlay() {
    if (state !== PAUSED && state !== GAMEOVER) {
        return;
    }

    Draw.rect(165, 160, 310, 135, C.bg);
    Draw.rect(169, 164, 302, 127, C.panel);

    if (state === PAUSED) {
        print(280, 190, "PAUSED", C.yellow);
        print(225, 235, "START: RESUME", C.white);
    }

    if (state === GAMEOVER) {
        print(265, 185, "GAME OVER", C.red);
        print(255, 215, "SCORE: " + score, C.white);
        print(225, 250, "START: RESTART", C.cyan);
    }
}

// ===================================
// INICIALIZACAO
// ===================================

Screen.setParam(
    Screen.DEPTH_TEST_ENABLE,
    false
);

Screen.setVSync(true);
Screen.clearColor(C.bg);

board = emptyBoard();
nextPiece = randomPiece();
newGame();

// ===================================
// LOOP PRINCIPAL
// ===================================

Screen.display(() => {

    // IMPORTANTE:
    // Evita rastros no PS2 fisico
    Screen.clear(C.bg);

    const now = Date.now();
    const delta = Math.min(now - lastTime, 100);

    lastTime = now;

    handleInput(now);

    if (state === PLAYING) {
        let speed = Math.max(
            90,
            700 - (level - 1) * 55
        );

        let interval = pad.pressed(Pads.DOWN)
            ? 45
            : speed;

        fallTime += delta;

        if (fallTime >= interval) {
            fallTime = 0;
            stepDown();
        }
    }

    if (state === MENU) {
        drawMenu();
    } else {
        drawBoard();
        drawUI();
        drawOverlay();
    }
});
