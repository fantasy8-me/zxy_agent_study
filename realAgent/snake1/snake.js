// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');

// 游戏配置
const gridSize = 20;
const tileCount = canvas.width / gridSize; // 400/20 = 20

// 游戏状态
let snake = [];
let food = {};
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let highScore = 0;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;
let speed = 100; // 毫秒

// 初始化高分
highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreElement.textContent = highScore;

// 初始化游戏
function initGame() {
    snake = [
        { x: 10, y: 10 }
    ];
    direction = { x: 0, y: 0 };
    nextDirection = { x: 0, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    gameRunning = false;
    gamePaused = false;
    generateFood();
    draw();
}

// 生成食物（确保不在蛇身上）
function generateFood() {
    do {
        food = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(15, 52, 96, 0.2)';
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

    // 绘制蛇
    snake.forEach((segment, index) => {
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;

        if (index === 0) {
            // 蛇头
            ctx.fillStyle = '#e94560';
            ctx.shadowColor = 'rgba(233, 69, 96, 0.5)';
            ctx.shadowBlur = 10;
            ctx.fillRect(x + 1, y + 1, gridSize - 2, gridSize - 2);
            
            // 蛇头光晕
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 4, y + 4, gridSize - 8, gridSize - 8);
            
            // 眼睛
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 0;
            if (direction.x === 1) {
                ctx.fillRect(x + 12, y + 4, 4, 4);
                ctx.fillRect(x + 12, y + 12, 4, 4);
            } else if (direction.x === -1) {
                ctx.fillRect(x + 4, y + 4, 4, 4);
                ctx.fillRect(x + 4, y + 12, 4, 4);
            } else if (direction.y === -1) {
                ctx.fillRect(x + 4, y + 4, 4, 4);
                ctx.fillRect(x + 12, y + 4, 4, 4);
            } else {
                ctx.fillRect(x + 4, y + 12, 4, 4);
                ctx.fillRect(x + 12, y + 12, 4, 4);
            }
        } else {
            // 蛇身
            const gradient = ctx.createLinearGradient(x, y, x + gridSize, y + gridSize);
            gradient.addColorStop(0, '#4ecca3');
            gradient.addColorStop(1, '#3a9e7e');
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 0;
            ctx.fillRect(x + 2, y + 2, gridSize - 4, gridSize - 4);
        }
    });

    ctx.shadowBlur = 0;

    // 绘制食物
    const fx = food.x * gridSize;
    const fy = food.y * gridSize;
    ctx.fillStyle = '#f9a826';
    ctx.shadowColor = 'rgba(249, 168, 38, 0.6)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(fx + gridSize / 2, fy + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 食物高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(fx + gridSize / 2 - 3, fy + gridSize / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();
}

// 更新游戏状态
function update() {
    // 应用方向
    direction = { ...nextDirection };

    // 如果蛇没有移动方向，不更新
    if (direction.x === 0 && direction.y === 0) return;

    // 计算新蛇头位置
    const head = snake[0];
    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y
    };

    // 检测穿墙 - 环绕
    if (newHead.x < 0) newHead.x = tileCount - 1;
    if (newHead.x >= tileCount) newHead.x = 0;
    if (newHead.y < 0) newHead.y = tileCount - 1;
    if (newHead.y >= tileCount) newHead.y = 0;

    // 检测自身碰撞
    if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        gameOver();
        return;
    }

    // 将新蛇头加入蛇身
    snake.unshift(newHead);

    // 检查是否吃到食物
    if (newHead.x === food.x && newHead.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        generateFood();
        
        // 加速
        if (speed > 50) {
            speed -= 2;
            clearInterval(gameLoop);
            gameLoop = setInterval(gameStep, speed);
        }
    } else {
        // 移除蛇尾
        snake.pop();
    }
}

// 游戏步进
function gameStep() {
    if (!gameRunning || gamePaused) return;
    update();
    draw();
}

// 开始游戏
function startGame() {
    if (gameRunning && !gamePaused) {
        // 重新开始
        clearInterval(gameLoop);
        initGame();
    }
    
    if (!gameRunning) {
        initGame();
    }
    
    gameRunning = true;
    gamePaused = false;
    startBtn.textContent = '重新开始';
    pauseBtn.textContent = '暂停';
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(gameStep, speed);
    
    // 设置初始方向（如果没有方向，给一个默认方向）
    if (nextDirection.x === 0 && nextDirection.y === 0) {
        nextDirection = { x: 1, y: 0 };
    }
}

// 暂停/继续游戏
function togglePause() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    pauseBtn.textContent = gamePaused ? '继续' : '暂停';
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);
    gameLoop = null;
    startBtn.textContent = '开始游戏';
    
    // 更新最高分
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    // 绘制游戏结束画面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 36px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 20);
    
    ctx.fillStyle = '#eee';
    ctx.font = '18px "Segoe UI"';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
    ctx.textAlign = 'start';
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // 防止页面滚动
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
        e.preventDefault();
    }
    
    // 开始/暂停
    if (key === ' ') {
        if (!gameRunning) {
            startGame();
        } else {
            togglePause();
        }
        return;
    }
    
    if (!gameRunning || gamePaused) return;
    
    // 方向控制（防止反向）
    switch (key) {
        case 'arrowup':
        case 'w':
            if (direction.y !== 1) {
                nextDirection = { x: 0, y: -1 };
            }
            break;
        case 'arrowdown':
        case 's':
            if (direction.y !== -1) {
                nextDirection = { x: 0, y: 1 };
            }
            break;
        case 'arrowleft':
        case 'a':
            if (direction.x !== 1) {
                nextDirection = { x: -1, y: 0 };
            }
            break;
        case 'arrowright':
        case 'd':
            if (direction.x !== -1) {
                nextDirection = { x: 1, y: 0 };
            }
            break;
    }
});

// 按钮事件
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);

// 触摸控制（移动端支持）
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    if (!gameRunning || gamePaused) return;
    
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