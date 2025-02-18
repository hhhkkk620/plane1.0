const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置画布尺寸
canvas.width = 800;
canvas.height = 600;

// 加载图片
const playerImage = new Image();
playerImage.src = '我方飞机.png';
const enemyImage = new Image();
enemyImage.src = '敌方飞机.png';
const fastEnemyImage = new Image();
fastEnemyImage.src = '敌方速度快的飞机.png';
const largeEnemyImage = new Image();
largeEnemyImage.src = '敌方大飞机.png';
const backgroundImage = new Image();
backgroundImage.src = '背景图.png'; // 添加背景图片

// 加载音效
const backgroundMusic = new Audio('背景音乐.mp3');
backgroundMusic.loop = true; // 循环播放
backgroundMusic.volume = 0.2; // 背景音乐音量
const shootSound = new Audio('射击音效.mp3');
shootSound.volume = 1; // 射击音效音量

// 游戏对象
const game = {
    player: null,
    enemies: [],
    bullets: [],
    score: 0,
    gameOver: false,
    paused: false,
    lastTime: 0,
    enemySpawnRate: 1500,
    bulletSpeed: 5,
    enemySpeed: 1,
    enemySpeedIncrement: 0.001,
    bulletFireRate: 200,
    lastBulletFire: 0,
    upgradePoints: 0,
    totalEnemiesDestroyed: 0,
    startTime: 0,
    endTime: 0,
    upgradeThreshold: 50,
    bulletCount: 1,
    upgradeAvailable: true,
};

// 玩家飞机类
class Player {
    constructor() {
        this.width = 80;
        this.height = 80;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
    }

    draw() {
        ctx.drawImage(playerImage, this.x, this.y, this.width, this.height);
    }

    update() {
        if (keys['a'] && this.x > 0) this.x -= this.speed;
        if (keys['d'] && this.x < canvas.width - this.width) this.x += this.speed;
    }

    upgrade(attribute) {
        if (game.upgradePoints >= game.upgradeThreshold && game.upgradeAvailable) {
            this[attribute] += 1;
            game.upgradePoints -= game.upgradeThreshold;
            game.upgradeAvailable = false;
            document.querySelectorAll('.upgradeButton').forEach(button => button.style.display = 'none');
        }
    }
}

// 敌机类
class Enemy {
    constructor(x, y, type = 'normal') {
        this.width = 50;
        this.height = 50;
        this.x = x;
        this.y = y;
        this.type = type;
        this.setProperties(type);
    }

    setProperties(type) {
        if (type === 'fast') {
            this.speed = game.enemySpeed * 1.5;
            this.image = fastEnemyImage;
        } else if (type === 'large') {
            this.width *= 1.5;
            this.height *= 1.5;
            this.image = largeEnemyImage;
        } else {
            this.speed = game.enemySpeed;
            this.image = enemyImage;
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Math.PI);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    update() {
        this.y += this.speed;
    }
}

// 子弹类
class Bullet {
    constructor(x, y) {
        this.width = 5;
        this.height = 10;
        this.x = x;
        this.y = y;
        this.speed = game.bulletSpeed;
    }

    draw() {
        ctx.fillStyle = '#ff0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y -= this.speed;
    }
}

// 生成敌机
function spawnEnemy() {
    const x = Math.random() * (canvas.width - 50);
    const y = -50;
    const type = Math.random() < 0.1 ? 'fast' : (Math.random() < 0.1 ? 'large' : 'normal');
    game.enemies.push(new Enemy(x, y, type));
}

// 检测碰撞
function checkCollision(rect1, rect2) {
    const dx = rect1.x + rect1.width / 2 - (rect2.x + rect2.width / 2);
    const dy = rect1.y + rect1.height / 2 - (rect2.y + rect2.height / 2);
    return Math.sqrt(dx * dx + dy * dy) < (rect1.width + rect2.width) / 2;
}

// 处理输入
const keys = {};
function handleKey(e, isPressed) {
    keys[e.key.toLowerCase()] = isPressed;
    if (e.key.toLowerCase() === 'p') {
        game.paused = !game.paused;
        if (!game.paused) requestAnimationFrame(gameLoop);
    }
    if (e.key === ' ') {
        // 按下空格键时发射子弹并播放射击音效
        if (isPressed) {
            shootBullet();
            shootSound.play(); // 播放射击音效
        }
    }
}

window.addEventListener('keydown', (e) => handleKey(e, true));
window.addEventListener('keyup', (e) => handleKey(e, false));

// 发射子弹
function shootBullet() {
    const bullet = new Bullet(game.player.x + game.player.width / 2 - 2.5, game.player.y);
    game.bullets.push(bullet);
}

// 游戏主循环
function gameLoop(timestamp) {
    if (game.gameOver || game.paused) return;

    const deltaTime = timestamp - game.lastTime;
    game.lastTime = timestamp;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

    // 更新和绘制玩家
    game.player.update();
    game.player.draw();

    // 更新和绘制子弹
    game.bullets.forEach((bullet, index) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < 0) game.bullets.splice(index, 1);
    });

    // 更新和绘制敌机
    game.enemies.forEach((enemy, index) => {
        enemy.update();
        enemy.draw();
        if (enemy.y > canvas.height) game.enemies.splice(index, 1);
        if (checkCollision(enemy, game.player)) {
            game.gameOver = true;
            game.endTime = performance.now();
            showGameOverScreen();
        }
    });

    // 检测子弹和敌机碰撞
    game.bullets.forEach((bullet, bulletIndex) => {
        game.enemies.forEach((enemy, enemyIndex) => {
            if (checkCollision(bullet, enemy)) {
                game.bullets.splice(bulletIndex, 1);
                game.enemies.splice(enemyIndex, 1);
                game.score += enemy.type === 'large' ? 5 : enemy.type === 'fast' ? 3 : 1;
                game.totalEnemiesDestroyed += 1;
                game.upgradePoints += 1;
                document.getElementById('score').innerText = game.score;
                if (game.score >= game.upgradeThreshold && game.upgradeAvailable) {
                    document.querySelectorAll('.upgradeButton').forEach(button => button.style.display = 'block');
                }
            }
        });
    });

    // 生成敌机
    if (timestamp - game.lastEnemySpawn > game.enemySpawnRate) {
        spawnEnemy();
        game.lastEnemySpawn = timestamp;
    }

    // 增加敌机速度和生成频率
    game.enemySpeed += game.enemySpeedIncrement;
    game.enemySpawnRate = Math.max(500, game.enemySpawnRate - 1);

    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 显示游戏结束界面
function showGameOverScreen() {
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.top = '50%';
    gameOverScreen.style.left = '50%';
    gameOverScreen.style.transform = 'translate(-50%, -50%)';
    gameOverScreen.style.padding = '20px';
    gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    gameOverScreen.style.color = '#fff';
    gameOverScreen.style.fontFamily = 'Arial, sans-serif';
    gameOverScreen.style.fontSize = '24px';
    gameOverScreen.style.textAlign = 'center';
    gameOverScreen.style.borderRadius = '10px';
    gameOverScreen.innerHTML = `
        <h1>飞机大战</h1>
        <p>游戏结束！</p>
        <p>得分：${game.score}</p>
        <p>击毁敌机数量：${game.totalEnemiesDestroyed}</p>
        <p>存活时间：${((game.endTime - game.startTime) / 1000).toFixed(2)}秒</p>
        <button onclick="restartGame()">再来一局</button>
    `;
    document.body.appendChild(gameOverScreen);
}

// 重新开始游戏
function restartGame() {
    document.querySelector('div[style*="position: absolute"]').remove();
    document.getElementById('restartButton').style.display = 'none';
    init();
}

// 初始化游戏
function init() {
    game.player = new Player();
    game.score = 0;
    game.gameOver = false;
    game.paused = false;
    game.enemies = [];
    game.bullets = [];
    game.lastEnemySpawn = 0;
    game.enemySpeed = 1;
    game.enemySpawnRate = 1500;
    game.lastBulletFire = 0;
    game.upgradePoints = 0;
    game.totalEnemiesDestroyed = 0;
    game.startTime = performance.now();
    game.bulletCount = 1;
    game.upgradeAvailable = true;

    // 启动背景音乐
    backgroundMusic.play();

    // 开始游戏循环
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// 启动游戏
document.getElementById('startButton').addEventListener('click', () => {
    document.getElementById('startButton').style.display = 'none';
    init();
});

// 升级按钮
document.getElementById('upgradeSpeedButton').addEventListener('click', () => game.player.upgrade('speed'));
document.getElementById('upgradeBulletSpeedButton').addEventListener('click', () => game.player.upgrade('bulletSpeed'));
document.getElementById('upgradeBulletCountButton').addEventListener('click', () => game.player.upgrade('bulletCount'));
