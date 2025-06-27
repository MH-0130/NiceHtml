const canvas = document.getElementById("aglcm-canvas");
const context = canvas.getContext("2d");

context.imageSmoothingEnabled = false;

// Stages
const stage_1 = [
    "11111111111100000000000000000001",
    "10000000000000000001111111000001",
    "10000000000000000002020202020201",
    "10000000000000010101010101010101",
    "10000000000020000101010101010101",
    "10000000000111000101010101010101",
    "10000000000000000101010100000001",
    "10000000000000000001010100000001",
    "10000001000000000000000000010001",
    "10000000000000000100010100010101",
    "10000000000000000101000101010101",
    "10000001000222000201010101210101",
    "11111111111111111100100101100011",
    "11111111111111111100100101100011",
    "11111111111111111100100101100011"
]

// System variables
const TILE_SIZE = 16;
let stage_height = stage_1.length; // array length
let stage_width = stage_1[0].length; // string length
let screen_x = 16;
let screen_y = 0;
const blocks_column_per_screen = 16;
const blocks_row_per_screen = blocks_column_per_screen * (3/4); // アスペクト比 4:3
let screen_stretch = canvas.width / (TILE_SIZE * blocks_column_per_screen);
let screen_vspeed = 0;
let screen_hspeed = 0;

const FRAMERATE = 30;
const PLAYER_SPEED = 3;

// stop button ----------------------------------------------
const toggle_stop = document.getElementById('toggle-stop');
let toggle_stop_toggled = false;

toggle_stop.addEventListener('click', () => {
    toggle_stop_toggled = !toggle_stop_toggled;

    if (!toggle_stop_toggled) {
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
});
// ----------------------------------------------------------

// game ---------------------------------------------------------------------

console.log("js successfully loaded");

// load sprites
const GROUND_0 = new Image();
GROUND_0.src = './sprites/ground0.png';

const SPIKE_UP = new Image();
SPIKE_UP.src = './sprites/spike_up.png'


class Block {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const testBlock = new Block(0, 0);

// Player
let keys = {
    left: false,
    right: false,
    up: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.left = true;
    if (e.code === 'ArrowRight') keys.right = true;
    if (e.code === 'ArrowUp') keys.up = true;
});
document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.left = false;
    if (e.code === 'ArrowRight') keys.right = false;
    if (e.code === 'ArrowUp') keys.up = false;
});

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.hspeed = 0;
        this.vspeed = 0;
        this.gravity = 20;         // 1秒で20ブロック加速
        this.maxFallSpeed = 30;    // 最大落下速度
        this.jumpPower = -12;      // ジャンプ速度
        this.speed = 6;            // 横移動速度
        this.collider_width = 0.9;
        this.collider_height = 0.9;
        this.sprite_width = 0.9;
        this.sprite_height = 0.9;
    }

    update(deltaTime) {
        const dt = deltaTime / 1000;

        // 横移動（入力）
        if (keys.left) this.hspeed = -this.speed;
        else if (keys.right) this.hspeed = this.speed;
        else this.hspeed = 0;

        // 重力
        this.vspeed += this.gravity * dt;
        if (this.vspeed > this.maxFallSpeed) this.vspeed = this.maxFallSpeed;

        // ジャンプ（接地していたら）
        if (keys.up && this.isOnGround()) {
            this.vspeed = this.jumpPower;
        }

        // 移動 & 簡易当たり判定
        this.move(dt);

        if (this.y > 16) this.y = 8;
    }

    move(dt) {
        // 横移動
        this.x += this.hspeed * dt;
        if (this.checkCollision()) {
            this.x -= this.hspeed * dt; // 衝突したら戻す
            this.hspeed = 0;
        }

        // 縦移動
        this.y += this.vspeed * dt;
        if (this.checkCollision()) {
            this.y -= this.vspeed * dt; // 衝突したら戻す
            if (this.vspeed > 0) {
                this.vspeed = 0; // 落下中の接地時
            } else {
                this.vspeed = 0;
            }
        }
    }

    checkCollision() {
        for (let dy = 0; dy <= this.collider_height; dy += 0.1) {
            for (let dx = 0; dx <= this.collider_width; dx += 0.1) {
                const tx = Math.floor(this.x + dx);
                const ty = Math.floor(this.y + dy);
                if (stage_1[ty] && stage_1[ty].charAt(tx) === "1") {
                    return true;
                }
            }
        }
        return false;
    }


    isOnGround() {
        const ty = Math.floor(this.y + this.collider_height + 0.01);
        const tx1 = Math.floor(this.x);
        const tx2 = Math.floor(this.x + this.collider_width - 0.01);
        if (stage_1[ty]) {
            return (
                stage_1[ty].charAt(tx1) === "1" ||
                stage_1[ty].charAt(tx2) === "1"
            );
        }
        return false;
    }

    draw() {
        // プレイヤー本体
        draw_block(this.x - screen_x, this.y - screen_y, this.sprite_width, this.sprite_height, "#55f");

        // hitbox枠（赤線）
        context.strokeStyle = "red";
        context.strokeRect(
            (this.x - screen_x) * TILE_SIZE * screen_stretch,
            (this.y - screen_y) * TILE_SIZE * screen_stretch,
            this.sprite_width * TILE_SIZE * screen_stretch,
            this.sprite_height * TILE_SIZE * screen_stretch
        );
    }

}


// Stage
const draw_block = (x, y, width, height, colorOrImage) => {
    const px = x * TILE_SIZE * screen_stretch;
    const py = y * TILE_SIZE * screen_stretch;
    const pw = width * TILE_SIZE * screen_stretch;
    const ph = height * TILE_SIZE * screen_stretch;

    if (typeof colorOrImage === "string") {
        // 文字列なら色
        context.fillStyle = colorOrImage;
        context.fillRect(px, py, pw, ph);
    } else if (colorOrImage instanceof HTMLImageElement && colorOrImage.complete) {
        // 画像なら描画（completeでロード確認）
        context.drawImage(colorOrImage, px, py, pw, ph);
    } else {
        // 読み込み中などなら代用色で描画
        context.fillStyle = "#888";
        context.fillRect(px, py, pw, ph);
    }
};

const draw_stage = (stage) => {
    for (var y = 0; y < stage_height; y++) {
        for (var x = 0; x < stage_width; x++) {
            switch (stage[y].charAt(x)) {
                case "0":
                    break;
                case "1":
                    draw_block(x - screen_x, y - screen_y, 1, 1, GROUND_0);
                    break;
                case "2":
                    draw_block(x - screen_x, y - screen_y, 1, 1, SPIKE_UP);
            }
        }
    }
}

// Game
const player = new Player(2, 8);

const update = deltaTime => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    draw_stage(stage_1);

    player.update(deltaTime);
    player.draw();
    
    screen_x = player.x - (canvas.width / (2 * 16 * screen_stretch));
    // 画面を止める処理
    screen_x = Math.max(0, Math.min(screen_x, stage_width - blocks_column_per_screen));

    screen_y = player.y - (canvas.height / (2 * 16 * screen_stretch));
    screen_y = Math.min(screen_y, stage_height - blocks_row_per_screen);
    
}

// 現在時刻を代入
let lastTime = performance.now();

const gameLoop = (currentTime) => {
    if (toggle_stop_toggled) return;

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
// --------------------------------------------------------------------------