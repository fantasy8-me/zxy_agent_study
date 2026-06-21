// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

// 游戏配置
const GRID_SIZE = 20; // 网格大小
const TILE_COUNT = canvas.width / GRID_SIZE; // 瓦片数量

// 游戏状态
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = {};
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let gameSpeed = 100; // 毫秒
let isRunning = false;
let isPaused = false;
let gameOver = false;

// 初始化最高分显示
highScoreElement.textContent = highScore;

// 初始化游戏
function initGame() {
    // 蛇的初始位置（从中间开始）
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    isPaused = false;
    pauseBtn.textContent = '暂停';
    generateFood();
    drawGame();
}

// 生成食物
function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

// 绘制游戏
function drawGame() {
    // 清空画布
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // 绘制食物
    ctx.fillStyle = '#ff4757';
    ctx.shadowColor = '#ff4757';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            const gradient = ctx.createRadialGradient(
                segment.x * GRID_SIZE + GRID_SIZE / 2,
                segment.y * GRID_SIZE + GRID_SIZE / 2,
                2,
                segment.x * GRID_SIZE + GRID_SIZE / 2,
                segment.y * GRID_SIZE + GRID_SIZE / 2,
                GRID_SIZE / 2
            );
            gradient.addColorStop(0, '#7bed9f');
            gradient.addColorStop(1, '#2ed573');
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#2ed573';
            ctx.shadowBlur = 8;
        } else {
            // 蛇身 - 渐变色
            const ratio = index / snake.length;
            const r = 46;
            const g = Math.floor(213 - ratio * 100);
            const b = Math.floor(115 - ratio * 50);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.shadowBlur = 0;
        }

        const padding = 2;
        const radius = 6;
        const x = segment.x * GRID_SIZE + padding;
        const y = segment.y * GRID_SIZE + padding;
        const size = GRID_SIZE - padding * 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + size - radius, y);
        ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
        ctx.lineTo(x + size, y + size - radius);
        ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
        ctx.lineTo(x + radius, y + size);
        ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 游戏结束画面
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff4757';
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#fff';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText('按"开始游戏"重新开始', canvas.width / 2, canvas.height / 2 + 25);
        ctx.textAlign = 'start';
    }

    // 暂停画面
    if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffd200';
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
        ctx.textAlign = 'start';
    }
}

// 更新游戏逻辑
function update() {
    if (!isRunning || isPaused || gameOver) return;

    // 更新方向
    direction = { ...nextDirection };

    // 计算新的蛇头位置
    const head = snake[0];
    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
    };

    // 穿墙逻辑
    if (newHead.x < 0) newHead.x = TILE_COUNT - 1;
    if (newHead.x >= TILE_COUNT) newHead.x = 0;
    if (newHead.y < 0) newHead.y = TILE_COUNT - 1;
    if (newHead.y >= TILE_COUNT) newHead.y = 0;

    // 检查是否吃到食物
    if (newHead.x === food.x && newHead.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        // 加速
        if (gameSpeed > 50) {
            gameSpeed -= 2;
            clearInterval(gameLoop);
            gameLoop = setInterval(gameStep, gameSpeed);
        }
    } else {
        // 移除尾部
        snake.pop();
    }

    // 检查是否撞到自己
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        endGame();
        return;
    }

    // 添加新蛇头
    snake.unshift(newHead);

    // 更新最高分
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('snakeHighScore', highScore);
    }

    drawGame();
}

// 游戏步进
function gameStep() {
    update();
}

// 开始游戏
function startGame() {
    if (gameOver) {
        initGame();
    }
    if (!isRunning) {
        isRunning = true;
        isPaused = false;
        pauseBtn.textContent = '暂停';
        gameLoop = setInterval(gameStep, gameSpeed);
        startBtn.textContent = '游戏中...';
        startBtn.style.opacity = '0.7';
    }
}

// 暂停/继续游戏
function togglePause() {
    if (!isRunning || gameOver) return;
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
    drawGame();
}

// 结束游戏
function endGame() {
    isRunning = false;
    gameOver = true;
    clearInterval(gameLoop);
    gameLoop = null;
    drawGame();
    startBtn.textContent = '开始游戏';
    startBtn.style.opacity = '1';
    gameSpeed = 100;
}

// 重新开始
function restartGame() {
    clearInterval(gameLoop);
    gameLoop = null;
    isRunning = false;
    gameSpeed = 100;
    startBtn.textContent = '开始游戏';
    startBtn.style.opacity = '1';
    pauseBtn.textContent = '暂停';
    initGame();
}

// 键盘控制
function handleKeyDown(e) {
    if (!isRunning || gameOver) return;

    switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
            if (direction.y !== 1) {
                nextDirection = { x: 0, y: -1 };
            }
            e.preventDefault();
            break;
        case 'arrowdown':
        case 's':
            if (direction.y !== -1) {
                nextDirection = { x: 0, y: 1 };
            }
            e.preventDefault();
            break;
        case 'arrowleft':
        case 'a':
            if (direction.x !== 1) {
                nextDirection = { x: -1, y: 0 };
            }
            e.preventDefault();
            break;
        case 'arrowright':
        case 'd':
            if (direction.x !== -1) {
                nextDirection = { x: 1, y: 0 };
            }
            e.preventDefault();
            break;
        case ' ':
            togglePause();
            e.preventDefault();
            break;
    }
}

// 事件监听
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);
document.addEventListener('keydown', handleKeyDown);

// 触摸控制（移动端）
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchend', (e) => {
    if (!isRunning || gameOver || isPaused) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0 && direction.x !== -1) {
            nextDirection = { x: 1, y: 0 };
        } else if (dx < 0 && direction.x !== 1) {
            nextDirection = { x: -1, y: 0 };
        }
    } else {
        // 垂直滑动
        if (dy > 0 && direction.y !== -1) {
            nextDirection = { x: 0, y: 1 };
        } else if (dy < 0 && direction.y !== 1) {
            nextDirection = { x: 0, y: -1 };
        }
    }
});

// 初始化
initGame();