// ============ 游戏配置 ============

const GAME_CONFIG = {
    // 鱼的配置
    fishSpecies: [
        {
            id: 'minnow',
            name: '小鱼',
            color: '#FFD700',
            depthRange: [0, 50],
            sizeRange: [5, 15],
            baseCoinPerSize: 2
        },
        {
            id: 'goldfish',
            name: '金鱼',
            color: '#FF6347',
            depthRange: [30, 100],
            sizeRange: [8, 20],
            baseCoinPerSize: 3
        },
        {
            id: 'catfish',
            name: '鲶鱼',
            color: '#8B4513',
            depthRange: [60, 150],
            sizeRange: [15, 30],
            baseCoinPerSize: 5
        },
        {
            id: 'salmon',
            name: '鲑鱼',
            color: '#CD5C5C',
            depthRange: [100, 200],
            sizeRange: [20, 35],
            baseCoinPerSize: 7
        },
        {
            id: 'deepfish',
            name: '深海鱼',
            color: '#4B0082',
            depthRange: [150, 300],
            sizeRange: [25, 40],
            baseCoinPerSize: 10
        },
        {
            id: 'ghostfish',
            name: '幽灵鱼',
            color: '#FFFFFF',
            depthRange: [250, 400],
            sizeRange: [30, 50],
            baseCoinPerSize: 15
        },
        {
            id: 'demonfish',
            name: '恶魔鱼',
            color: '#FF1493',
            depthRange: [300, 500],
            sizeRange: [35, 60],
            baseCoinPerSize: 20
        }
    ],

    // 初始升级配置
    upgrades: {
        maxDepth: {
            baseValue: 100,
            baseCost: 50,
            costMultiplier: 1.5,
            maxLevel: 20,
            valueIncrement: 50
        },
        speed: {
            baseValue: 50,
            baseCost: 50,
            costMultiplier: 1.5,
            maxLevel: 20,
            valueIncrement: 5
        },
        inventoryCapacity: {
            baseValue: 20,
            baseCost: 50,
            costMultiplier: 1.5,
            maxLevel: 20,
            valueIncrement: 10
        }
    }
};

// ============ 游戏状态 ============

const gameState = {
    isRunning: false,
    isPaused: false,
    coins: 0,
    totalIncome: 0,
    fishCaught: 0,

    // 背包
    inventory: [],
    inventoryCapacity: 20,
    inventorySlots: 4, // 每条鱼占4格，但配置说5格

    // 升级等级
    upgradeLevels: {
        maxDepth: 1,
        speed: 1,
        inventoryCapacity: 1
    },

    // 钩子状态
    hookState: {
        position: 0,
        maxDepth: 100,
        speed: 50, // m/s
        state: 'idle', // idle, casting, waiting, pulling
        direction: 'down' // down, up
    },

    // 当前鱼（如果有的话）
    currentFish: null,
    waitStartTime: 0,
    waitDuration: 0
};

// ============ UI 元素 ============

const UI = {
    canvas: document.getElementById('fishing-canvas'),
    hook: document.getElementById('hook'),
    hookLine: document.getElementById('hook-line'),
    fishGroup: document.getElementById('fish-group'),
    depthMarkers: document.getElementById('depth-markers'),
    statusText: document.getElementById('status-text'),
    coinsDisplay: document.getElementById('coins'),
    inventoryCountDisplay: document.getElementById('inventory-count'),
    currentDepthDisplay: document.getElementById('current-depth'),
    inventoryList: document.getElementById('inventory-list'),
    sellAllBtn: document.getElementById('sell-all-btn'),
    sellSummary: document.getElementById('sell-summary'),
    startBtn: document.getElementById('start-btn'),
    pauseBtn: document.getElementById('pause-btn'),
    resetBtn: document.getElementById('reset-btn'),
    fishCountDisplay: document.getElementById('fish-count'),
    totalIncomeDisplay: document.getElementById('total-income'),

    // 升级按钮
    upgradeButtons: {
        maxDepth: document.getElementById('upgrade-max-depth'),
        speed: document.getElementById('upgrade-speed'),
        inventoryCapacity: document.getElementById('upgrade-inventory-capacity')
    }
};

// ============ 存档系统 ============

function saveGame() {
    const saveData = {
        coins: gameState.coins,
        totalIncome: gameState.totalIncome,
        fishCaught: gameState.fishCaught,
        inventory: gameState.inventory,
        inventoryCapacity: gameState.inventoryCapacity,
        upgradeLevels: gameState.upgradeLevels,
        hookState: {
            maxDepth: gameState.hookState.maxDepth,
            speed: gameState.hookState.speed
        }
    };
    localStorage.setItem('deepAbyssGameSave', JSON.stringify(saveData));
}

function loadGame() {
    const saveData = localStorage.getItem('deepAbyssGameSave');
    if (saveData) {
        try {
            const data = JSON.parse(saveData);
            gameState.coins = data.coins || 0;
            gameState.totalIncome = data.totalIncome || 0;
            gameState.fishCaught = data.fishCaught || 0;
            gameState.inventory = data.inventory || [];
            gameState.inventoryCapacity = data.inventoryCapacity || 20;
            gameState.upgradeLevels = data.upgradeLevels || {
                maxDepth: 1,
                speed: 1,
                inventoryCapacity: 1
            };
            
            // 恢复升级状态
            gameState.hookState.maxDepth = data.hookState?.maxDepth || 100;
            gameState.hookState.speed = data.hookState?.speed || 50;
            
            return true;
        } catch (e) {
            console.error('读取存档失败:', e);
            return false;
        }
    }
    return false;
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFishAtDepth(depth) {
    // 找到该深度下可能出现的鱼
    const available = GAME_CONFIG.fishSpecies.filter(fish => {
        return depth >= fish.depthRange[0] && depth <= fish.depthRange[1];
    });

    if (available.length === 0) {
        // 如果深度超出范围，返回最深的鱼
        return GAME_CONFIG.fishSpecies[GAME_CONFIG.fishSpecies.length - 1];
    }

    return available[randomInt(0, available.length - 1)];
}

function generateFish(depth) {
    const species = getFishAtDepth(depth);
    const size = randomBetween(species.sizeRange[0], species.sizeRange[1]);
    // 线性关系：大小越大，金币越多
    const coins = Math.floor(species.baseCoinPerSize * size);

    return {
        species: species.id,
        speciesName: species.name,
        size: size.toFixed(1),
        coins: coins,
        color: species.color
    };
}

function getUpgradeCost(upgradeType, level) {
    const config = GAME_CONFIG.upgrades[upgradeType];
    return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level - 1));
}

function getUpgradeValue(upgradeType, level) {
    const config = GAME_CONFIG.upgrades[upgradeType];
    return config.baseValue + config.valueIncrement * (level - 1);
}

// ============ 背包管理 ============

function addFishToInventory(fish) {
    gameState.inventory.push(fish);
    updateInventoryDisplay();
}

function canAddFish() {
    const usedSlots = gameState.inventory.length * 5;
    return usedSlots + 5 <= gameState.inventoryCapacity;
}

function sellAllFish() {
    if (gameState.inventory.length === 0) {
        gameState.coins += 0;
        updateUI();
        return;
    }

    let totalCoins = 0;
    const sellBreakdown = {};

    gameState.inventory.forEach(fish => {
        totalCoins += fish.coins;
        if (!sellBreakdown[fish.speciesName]) {
            sellBreakdown[fish.speciesName] = { count: 0, coins: 0 };
        }
        sellBreakdown[fish.speciesName].count += 1;
        sellBreakdown[fish.speciesName].coins += fish.coins;
    });

    gameState.coins += totalCoins;
    gameState.totalIncome += totalCoins;
    gameState.inventory = [];
    saveGame(); // 保存进度

    // 显示出售总结
    let summaryText = `成功出售 ${Object.values(sellBreakdown).reduce((sum, item) => sum + item.count, 0)} 条鱼，获得 ${totalCoins} 金币`;
    UI.sellSummary.textContent = summaryText;
    UI.sellSummary.style.opacity = '1';
    setTimeout(() => {
        UI.sellSummary.style.opacity = '0.3';
    }, 3000);

    updateUI();
    
    // 如果背包不满了，继续钓鱼
    if (gameState.isRunning && gameState.hookState.state === 'idle') {
        castHook();
    }
}

function updateInventoryDisplay() {
    const usedSlots = gameState.inventory.length * 5;
    UI.inventoryCountDisplay.textContent = `${usedSlots}/${gameState.inventoryCapacity}`;

    // 更新背包列表显示
    UI.inventoryList.innerHTML = '';
    if (gameState.inventory.length === 0) {
        UI.inventoryList.textContent = '(空)';
    } else {
        gameState.inventory.forEach((fish, index) => {
            const item = document.createElement('div');
            item.className = 'inventory-item';
            item.innerHTML = `
                <span class="inventory-item-name">${fish.speciesName}</span>
                <span class="inventory-item-size">${fish.size}cm</span>
                <span class="inventory-item-price">+${fish.coins}枚</span>
            `;
            UI.inventoryList.appendChild(item);
        });
    }
}

// ============ 升级系统 ============

function upgradeAbility(upgradeType) {
    const currentLevel = gameState.upgradeLevels[upgradeType];
    const config = GAME_CONFIG.upgrades[upgradeType];

    if (currentLevel >= config.maxLevel) {
        alert('已达到最大等级');
        return;
    }

    const cost = getUpgradeCost(upgradeType, currentLevel);

    if (gameState.coins < cost) {
        alert(`金币不足！需要 ${cost} 金币，当前有 ${gameState.coins} 金币`);
        return;
    }

    gameState.coins -= cost;
    gameState.upgradeLevels[upgradeType]++;

    // 更新游戏参数
    if (upgradeType === 'maxDepth') {
        gameState.hookState.maxDepth = getUpgradeValue('maxDepth', gameState.upgradeLevels.maxDepth);
        drawDepthMarkers(); // 重新绘制深度标记
    } else if (upgradeType === 'speed') {
        gameState.hookState.speed = getUpgradeValue('speed', gameState.upgradeLevels.speed);
    } else if (upgradeType === 'inventoryCapacity') {
        gameState.inventoryCapacity = getUpgradeValue('inventoryCapacity', gameState.upgradeLevels.inventoryCapacity);
    }

    saveGame(); // 保存进度
    updateUI();
}

function updateUpgradeButtons() {
    Object.keys(UI.upgradeButtons).forEach(upgradeType => {
        const level = gameState.upgradeLevels[upgradeType];
        const config = GAME_CONFIG.upgrades[upgradeType];
        const btn = UI.upgradeButtons[upgradeType];

        if (level >= config.maxLevel) {
            btn.disabled = true;
            btn.textContent = '已满级';
        } else {
            const cost = getUpgradeCost(upgradeType, level);
            btn.disabled = gameState.coins < cost;
            btn.textContent = `升级 (${cost})`;
        }
    });
}

// ============ 钓鱼逻辑 ============

function castHook() {
    if (!canAddFish()) {
        gameState.hookState.state = 'idle';
        UI.statusText.textContent = '背包已满，请出售鱼类';
        return;
    }

    gameState.hookState.state = 'casting';
    gameState.hookState.position = 0;
    gameState.hookState.direction = 'down';
    UI.statusText.textContent = '鱼钩下沉中...';
}

function startWaiting(depth) {
    gameState.hookState.state = 'waiting';
    gameState.waitDuration = randomInt(1000, 5000); // 1-5秒
    gameState.waitStartTime = Date.now();
    gameState.currentFish = generateFish(depth);
    UI.statusText.textContent = `等待鱼上钩... (${gameState.currentFish.speciesName})`;
}

function pullHook() {
    gameState.hookState.state = 'pulling';
    gameState.hookState.direction = 'up';
    UI.statusText.textContent = '鱼上钩！收杆中...';
}

function fishCaught() {
    if (gameState.currentFish) {
        addFishToInventory(gameState.currentFish);
        gameState.fishCaught++;
        UI.fishCountDisplay.textContent = gameState.fishCaught;
        saveGame(); // 保存进度

        const fish = gameState.currentFish;
        UI.statusText.textContent = `成功钓到 ${fish.speciesName} (${fish.size}cm) +${fish.coins}枚金币`;
        gameState.currentFish = null;
    }

    gameState.hookState.position = 0;
    gameState.hookState.state = 'idle';

    if (canAddFish()) {
        setTimeout(() => {
            if (gameState.isRunning) {
                castHook();
            }
        }, 500);
    } else {
        gameState.hookState.state = 'idle';
        UI.statusText.textContent = '背包已满，请出售鱼类';
    }
}

// ============ 动画和更新 ============

function drawDepthMarkers() {
    UI.depthMarkers.innerHTML = '';
    const maxDepth = gameState.hookState.maxDepth;
    const centerY = 300; // 画面中间
    const currentDepth = gameState.hookState.position;
    const canvasHeight = 550; // 从50到600
    const displayRange = 25; // 显示范围的一半，总共50m
    const transitionDepth = 50; // 转换点：0-50m为浅水模式

    let displayStartDepth, displayEndDepth;
    
    if (currentDepth <= transitionDepth) {
        // 浅水模式（0-50m）：显示范围固定为0到100m
        displayStartDepth = 0;
        displayEndDepth = 100;
    } else {
        // 深水模式（>50m）：显示范围为currentDepth ± 25m
        displayStartDepth = currentDepth - displayRange;
        displayEndDepth = currentDepth + displayRange;
    }

    displayEndDepth = Math.min(displayEndDepth, maxDepth);
    const displayHeight = displayEndDepth - displayStartDepth;
    const pixelsPerMeter = canvasHeight / displayHeight;

    // 每50米一个标记
    for (let depth = Math.ceil(displayStartDepth / 50) * 50; depth <= displayEndDepth; depth += 50) {
        let y;
        
        if (currentDepth <= transitionDepth) {
            // 浅水模式：刻度相对于海平面固定
            y = 50 + (depth - displayStartDepth) * pixelsPerMeter;
        } else {
            // 深水模式：刻度相对于鱼钩（中间）浮动
            y = centerY + (depth - currentDepth) * pixelsPerMeter;
        }

        // 只显示在可见范围内的标记
        if (y >= 20 && y <= 580) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y);
            line.setAttribute('x2', '30');
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#bbb');
            line.setAttribute('stroke-width', '1');

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '35');
            text.setAttribute('y', y + 3);
            text.setAttribute('font-size', '11');
            text.setAttribute('fill', '#666');
            text.textContent = `${depth}m`;

            UI.depthMarkers.appendChild(line);
            UI.depthMarkers.appendChild(text);
        }
    }
}

function updateHookPosition() {
    const centerY = 300;
    const canvasHeight = 550;
    const maxDepth = gameState.hookState.maxDepth;
    const currentDepth = gameState.hookState.position;
    const transitionDepth = 50; // 转换点：0-50m为浅水模式

    let hookY;
    
    if (currentDepth <= transitionDepth) {
        // 浅水模式（0-50m）：鱼钩根据深度自适应向上/向下移动
        // 显示范围是0-100m（canvasHeight = 550），鱼钩从y=50（0m）到y=325（50m）
        hookY = 50 + (currentDepth / 100) * canvasHeight;
    } else {
        // 深水模式（>50m）：鱼钩始终在中间
        hookY = centerY;
    }

    // 更新钩子位置
    UI.hook.setAttribute('cy', hookY);
    UI.hookLine.setAttribute('y1', 50);
    UI.hookLine.setAttribute('y2', hookY);

    // 更新深度显示
    UI.currentDepthDisplay.textContent = `${currentDepth.toFixed(0)}m`;
}

function drawFish() {
    UI.fishGroup.innerHTML = '';

    if (!gameState.currentFish) return;

    const fish = gameState.currentFish;
    const canvasHeight = 550;
    const maxDepth = gameState.hookState.maxDepth;

    // 在等待状态时显示鱼
    if (gameState.hookState.state === 'waiting') {
        const depth = gameState.hookState.position;
        const y = 50 + (depth / maxDepth) * canvasHeight;

        // 根据鱼的尺寸计算绘制大小（相对于平均尺寸范围）
        const species = GAME_CONFIG.fishSpecies.find(s => s.id === fish.species);
        const avgSize = (species.sizeRange[0] + species.sizeRange[1]) / 2;
        const sizeRatio = parseFloat(fish.size) / avgSize;
        
        // 创建鱼
        const fishGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        fishGroup.setAttribute('class', 'fish');

        // 鱼身（椭圆），大小根据fish.size调整
        const bodyRx = 20 * sizeRatio;
        const bodyRy = 10 * sizeRatio;
        
        const body = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        body.setAttribute('cx', '500');
        body.setAttribute('cy', y);
        body.setAttribute('rx', bodyRx);
        body.setAttribute('ry', bodyRy);
        body.setAttribute('fill', fish.color);
        body.setAttribute('class', 'fish-body');

        // 鱼眼
        const eye = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        eye.setAttribute('cx', 515 - bodyRx);
        eye.setAttribute('cy', y - bodyRy * 0.5);
        eye.setAttribute('r', 2 * sizeRatio);
        eye.setAttribute('fill', '#000');

        // 鱼尾
        const tail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const tailX = 480 - bodyRx;
        const tailY1 = y - bodyRy;
        const tailY2 = y + bodyRy;
        tail.setAttribute('d', `M ${tailX} ${y} L ${tailX - 25 * sizeRatio} ${tailY1} L ${tailX - 25 * sizeRatio} ${tailY2} Z`);
        tail.setAttribute('fill', fish.color);
        tail.setAttribute('opacity', '0.7');

        fishGroup.appendChild(body);
        fishGroup.appendChild(eye);
        fishGroup.appendChild(tail);

        UI.fishGroup.appendChild(fishGroup);
    }
}

// 游戏主循环
let lastFrameTime = Date.now();

function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; // 转换为秒
    lastFrameTime = currentTime;

    // 更新鱼钩位置
    if (gameState.hookState.state === 'casting') {
        // 下沉：position单位为米，speed单位为m/s
        const distancePerFrame = gameState.hookState.speed * deltaTime;
        gameState.hookState.position += distancePerFrame;

        if (gameState.hookState.position >= gameState.hookState.maxDepth) {
            gameState.hookState.position = gameState.hookState.maxDepth;
            startWaiting(gameState.hookState.maxDepth);
        }
    } else if (gameState.hookState.state === 'waiting') {
        // 检查是否等待时间结束
        const elapsedTime = Date.now() - gameState.waitStartTime;
        if (elapsedTime >= gameState.waitDuration) {
            pullHook();
        }
    } else if (gameState.hookState.state === 'pulling') {
        // 上升
        const distancePerFrame = gameState.hookState.speed * deltaTime;
        gameState.hookState.position -= distancePerFrame;

        if (gameState.hookState.position <= 0) {
            gameState.hookState.position = 0;
            fishCaught();
        }
    }

    updateHookPosition();
    drawDepthMarkers(); // 每帧更新深度刻度，实现滚动效果
    requestAnimationFrame(gameLoop);
}

// ============ UI 更新 ============

function updateUI() {
    UI.coinsDisplay.textContent = gameState.coins;
    UI.totalIncomeDisplay.textContent = gameState.totalIncome;
    UI.fishCountDisplay.textContent = gameState.fishCaught;
    updateInventoryDisplay();
    updateUpgradeButtons();

    // 更新升级显示
    const maxDepthLevel = gameState.upgradeLevels.maxDepth;
    const speedLevel = gameState.upgradeLevels.speed;
    const inventoryCapacityLevel = gameState.upgradeLevels.inventoryCapacity;

    document.getElementById('max-depth-level').textContent = `Lv.${maxDepthLevel}`;
    document.getElementById('max-depth-value').textContent = gameState.hookState.maxDepth;
    document.getElementById('max-depth-cost').textContent = getUpgradeCost('maxDepth', maxDepthLevel);

    document.getElementById('speed-level').textContent = `Lv.${speedLevel}`;
    document.getElementById('speed-value').textContent = gameState.hookState.speed;
    document.getElementById('speed-cost').textContent = getUpgradeCost('speed', speedLevel);

    document.getElementById('inventory-capacity-level').textContent = `Lv.${inventoryCapacityLevel}`;
    document.getElementById('inventory-capacity-value').textContent = gameState.inventoryCapacity;
    document.getElementById('inventory-capacity-cost').textContent = getUpgradeCost('inventoryCapacity', inventoryCapacityLevel);
}

// ============ 事件监听 ============

UI.startBtn.addEventListener('click', () => {
    if (!gameState.isRunning) {
        gameState.isRunning = true;
        gameState.isPaused = false;
        lastFrameTime = Date.now(); // 重置帧计时器
        UI.statusText.textContent = '游戏进行中...';
        UI.startBtn.textContent = '继续';
        UI.pauseBtn.disabled = false;
        castHook();
        gameLoop();
    }
});

UI.pauseBtn.addEventListener('click', () => {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        UI.statusText.textContent = '游戏已暂停';
        UI.pauseBtn.textContent = '继续';
    } else {
        UI.statusText.textContent = '游戏继续中...';
        UI.pauseBtn.textContent = '暂停';
        lastFrameTime = Date.now(); // 重置帧计时器，避免时间跳跃
        gameLoop();
    }
});

UI.resetBtn.addEventListener('click', () => {
    if (confirm('确认重置游戏？所有进度将丢失')) {
        gameState.isRunning = false;
        gameState.isPaused = false;
        gameState.coins = 0;
        gameState.totalIncome = 0;
        gameState.fishCaught = 0;
        gameState.inventory = [];
        gameState.inventoryCapacity = 20;
        gameState.upgradeLevels = {
            maxDepth: 1,
            speed: 1,
            inventoryCapacity: 1
        };
        gameState.hookState = {
            position: 0,
            maxDepth: 100,
            speed: 50,
            state: 'idle',
            direction: 'down'
        };
        lastFrameTime = Date.now(); // 重置帧计时器

        UI.startBtn.textContent = '开始游戏';
        UI.pauseBtn.disabled = true;
        UI.pauseBtn.textContent = '暂停';
        UI.statusText.textContent = '准备就绪';
        UI.sellSummary.textContent = '';

        updateUI();
        updateHookPosition();
    }
});

UI.sellAllBtn.addEventListener('click', () => {
    if (gameState.inventory.length > 0) {
        sellAllFish();
    }
});

// 升级按钮事件
Object.keys(UI.upgradeButtons).forEach(upgradeType => {
    UI.upgradeButtons[upgradeType].addEventListener('click', () => {
        upgradeAbility(upgradeType);
    });
});

// ============ 初始化 ============

document.addEventListener('DOMContentLoaded', () => {
    // 尝试加载保存的游戏
    const hasBackup = loadGame();
    if (hasBackup) {
        UI.statusText.textContent = '已加载上次的游戏进度';
    }
    
    drawDepthMarkers();
    updateUI();
    updateHookPosition();
    UI.pauseBtn.disabled = true;
});
