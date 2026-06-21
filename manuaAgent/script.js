// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const restartBtn = document.getElementById('restartBtn');

// 游戏配置
const GRID_SIZE = 20;
const CELL_SIZE = canvas.width / GRID_SIZE;

// 游戏状态
let snake = [];
let direction = 'right';
let nextDirection = 'right';
let food = {};
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameRunning = false;
let gameLoop = null;
let gameSpeed = 100;

// 初始化最高分显示
highScoreElement.textContent = highScore;

// 初始化游戏
function initGame() {
    // 蛇的初始位置（在中间）
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    scoreElement.textContent = score;
    generateFood();
    gameRunning = true;
}

// 生成食物
function generateFood() {
    let newFood;
    let isValid = false;
    while (!isValid) {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        // 检查食物是否生成在蛇身上
        isValid = !snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    food = newFood;
}

// 游戏更新
function update() {
    if (!gameRunning) return;

    // 更新方向
    direction = nextDirection;

    // 计算蛇头新位置
    const head = { ...snake[0] };
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    // 检查是否吃到食物
    const ateFood = head.x === food.x && head.y === food.y;

    // 构建新蛇
    let newSnake = [head, ...snake];
    if (!ateFood) {
        newSnake.pop(); // 没吃到食物移除尾部
    }

    // 碰撞检测
    const headCollision = checkCollision(newSnake);
    if (headCollision) {
        gameOver();
        return;
    }

    snake = newSnake;

    // 如果吃到食物
    if (ateFood) {
        score++;
        scoreElement.textContent = score;
        generateFood();
        // 每5分加速一次
        if (score % 5 === 0 && gameSpeed > 60) {
            clearInterval(gameLoop);
            gameSpeed = Math.max(60, gameSpeed - 10);
            gameLoop = setInterval(update, gameSpeed);
        }
    }

    // 渲染
    draw();
}

// 碰撞检测
function checkCollision(snakeArray) {
    const head = snakeArray[0];

    // 墙壁碰撞
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        return true;
    }

    // 自碰检测（蛇头碰到自己的身体）
    for (let i = 1; i < snakeArray.length; i++) {
        if (snakeArray[i].x === head.x && snakeArray[i].y === head.y) {
            return true;
        }
    }
    return false;
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;

    // 更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }

    // 绘制游戏结束信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '20px Arial';
    ctx.fillText('点击"重新开始"继续', canvas.width / 2, canvas.height / 2 + 30);
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格（浅色线）
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }

    // 绘制食物
    ctx.fillStyle = '#ff4757';
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
        food.x * CELL_SIZE + CELL_SIZE / 2,
        food.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制蛇
    snake.forEach((segment, index) => {
        const x = segment.x * CELL_SIZE;
        const y = segment.y * CELL_SIZE;
        const padding = index === 0 ? 2 : 3;
        const radius = 5;

        // 蛇身渐变色
        const gradient = ctx.createRadialGradient(
            x + padding, y + padding, 2,
            x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2
        );

        if (index === 0) {
            // 蛇头
            gradient.addColorStop(0, '#2ed573');
            gradient.addColorStop(1, '#1b8a4a');
            ctx.shadowColor = '#2ed573';
            ctx.shadowBlur = 8;
        } else {
            // 蛇身
            const intensity = 1 - (index / snake.length) * 0.5;
            gradient.addColorStop(0, `rgba(46, 213, 115, ${intensity})`);
            gradient.addColorStop(1, `rgba(27, 138, 74, ${intensity})`);
            ctx.shadowBlur = 0;
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4, radius);
        ctx.fill();

        // 蛇头眼睛
        if (index === 0) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            const eyeSize = 4;
            let eyeOffsets = [];
            switch (direction) {
                case 'up': eyeOffsets = [{ x: 4, y: 2 }, { x: 12, y: 2 }]; break;
                case 'down': eyeOffsets = [{ x: 4, y: 14 }, { x: 12, y: 14 }]; break;
                case 'left': eyeOffsets = [{ x: 2, y: 4 }, { x: 2, y: 12 }]; break;
                case 'right': eyeOffsets = [{ x: 14, y: 4 }, { x: 14, y: 12 }]; break;
            }
            eyeOffsets.forEach(offset => {
                ctx.beginPath();
                ctx.arc(x + offset.x, y + offset.y, eyeSize / 2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = '#2d3436';
            eyeOffsets.forEach(offset => {
                ctx.beginPath();
                ctx.arc(x + offset.x + (direction === 'right' ? 2 : direction === 'left' ? -2 : 0),
                    y + offset.y + (direction === 'down' ? 2 : direction === 'up' ? -2 : 0),
                    eyeSize / 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    });
    ctx.shadowBlur = 0;
}

// 添加 roundRect 方法
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
};

// 键盘控制
function handleKeyPress(e) {
    const key = e.key;
    e.preventDefault();

    if (!gameRunning) return;

    switch (key) {
        case 'ArrowUp': if (direction !== 'down') nextDirection = 'up'; break;
        case 'ArrowDown': if (direction !== 'up') nextDirection = 'down'; break;
        case 'ArrowLeft': if (direction !== 'right') nextDirection = 'left'; break;
        case 'ArrowRight': if (direction !== 'left') nextDirection = 'right'; break;
    }
}

// 按钮控制
function handleDirection(dir) {
    if (!gameRunning) return;
    switch (dir) {
        case 'up': if (direction !== 'down') nextDirection = 'up'; break;
        case 'down': if (direction !== 'up') nextDirection = 'down'; break;
        case 'left': if (direction !== 'right') nextDirection = 'left'; break;
        case 'right': if (direction !== 'left') nextDirection = 'right'; break;
    }
}

// 重新开始游戏
function restartGame() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    gameSpeed = 100;
    initGame();
    draw();
    gameLoop = setInterval(update, gameSpeed);
}

// 启动游戏
function startGame() {
    initGame();
    draw();
    if (gameLoop) {
        clearInterval(gameLoop);
    }
    gameLoop = setInterval(update, gameSpeed);
}

// 事件监听
document.addEventListener('keydown', handleKeyPress);

// 方向按钮事件
document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const dir = btn.dataset.dir;
        handleDirection(dir);
    });
});

restartBtn.addEventListener('click', restartGame);

// 防止页面滚动
document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
});

// 启动游戏
startGame();