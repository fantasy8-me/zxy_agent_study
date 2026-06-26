// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// 游戏配置
const gridSize = 20; // 网格大小
const tileCount = canvas.width / gridSize; // 网格数量 (20x20)
let gameSpeed = 100; // 游戏速度(ms)

// 游戏状态变量
let snake = [];
let direction = { x: 0, y: 0 };
let food = {};
let score = 0;
let gameRunning = false;
let gameLoop = null;
let nextDirection = { x: 0, y: 0 };

// 初始化游戏
function initGame() {
    // 蛇初始位置（中间偏左）
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 }; // 初始向右移动
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = '0';
    generateFood();
}

// 生成食物
function generateFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    food = newFood;
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线（可选，增加视觉效果）
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    // 绘制食物
    ctx.fillStyle = '#ff6b6b';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头
            ctx.fillStyle = '#00ff88';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 8;
        } else {
            // 蛇身（渐变效果）
            const alpha = 1 - (index / snake.length) * 0.5;
            ctx.fillStyle = `rgba(0, 200, 100, ${alpha})`;
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(
            segment.x * gridSize + 2,
            segment.y * gridSize + 2,
            gridSize - 4,
            gridSize - 4
        );
    });
    ctx.shadowBlur = 0;
}

// 更新游戏逻辑
function update() {
    // 更新方向
    direction = { ...nextDirection };

    // 计算新头部位置
    const head = { ...snake[0] };
    head.x += direction.x;
    head.y += direction.y;

    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }

    // 检查自身碰撞
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    // 添加新头部
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        // 每吃5个食物加速
        if (score % 50 === 0 && gameSpeed > 50) {
            gameSpeed -= 5;
            clearInterval(gameLoop);
            gameLoop = setInterval(gameStep, gameSpeed);
        }
    } else {
        // 移除尾部
        snake.pop();
    }
}

// 游戏步进
function gameStep() {
    update();
    draw();
}

// 开始游戏
function startGame() {
    if (gameRunning) return;
    gameRunning = true;
    initGame();
    draw();
    gameLoop = setInterval(gameStep, gameSpeed);
    startBtn.textContent = '游戏中...';
    startBtn.disabled = true;
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;

    // 绘制游戏结束画面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 15);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`最终得分: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'start';

    startBtn.textContent = '开始游戏';
    startBtn.disabled = false;
}

// 重新开始游戏
function restartGame() {
    clearInterval(gameLoop);
    gameLoop = null;
    gameRunning = false;
    gameSpeed = 100;
    initGame();
    draw();
    startBtn.textContent = '开始游戏';
    startBtn.disabled = false;
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    const key = e.key.toLowerCase();

    // 防止方向反转
    switch (key) {
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
    }
});

// 按钮事件监听
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

// 初始绘制
initGame();
draw();