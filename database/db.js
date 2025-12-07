const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');
const RAFFLES_PATH = path.join(__dirname, 'raffles.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const SHOP_PATH = path.join(__dirname, 'shop.json');
const ITEM_RAFFLES_PATH = path.join(__dirname, 'itemRaffles.json');
const GAME_SETTINGS_PATH = path.join(__dirname, 'gameSettings.json');

function loadJSON(filepath, defaultValue = {}) {
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
    } catch (e) {
        console.error(`Error loading ${filepath}:`, e);
    }
    return defaultValue;
}

function saveJSON(filepath, data) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Error saving ${filepath}:`, e);
    }
}

let users = loadJSON(DB_PATH, {});
let raffles = loadJSON(RAFFLES_PATH, { active: null, history: [] });
let logs = loadJSON(LOGS_PATH, { entries: [], channelId: null });
let settings = loadJSON(SETTINGS_PATH, { houseProfit: 0, adminIds: [], dailyEnabled: true });
let shop = loadJSON(SHOP_PATH, { items: [], nextId: 1 });
let itemRaffles = loadJSON(ITEM_RAFFLES_PATH, { active: null, history: [] });
let gameSettings = loadJSON(GAME_SETTINGS_PATH, {
    slots: { minBet: 10, maxBet: 100000, enabled: true },
    blackjack: { minBet: 10, maxBet: 100000, enabled: true },
    poker: { minBet: 50, maxBet: 100000, enabled: true },
    highlow: { minBet: 10, maxBet: 100000, enabled: true },
    war: { minBet: 10, maxBet: 100000, enabled: true },
    roulette: { minBet: 10, maxBet: 100000, enabled: true },
    baccarat: { minBet: 10, maxBet: 100000, enabled: true },
    crash: { minBet: 10, maxBet: 100000, enabled: true, maxMultiplier: 100 },
    dice: { minBet: 10, maxBet: 100000, enabled: true },
    mines: { minBet: 10, maxBet: 100000, enabled: true, gridSize: 25, maxMines: 24 },
    coinflip: { minBet: 10, maxBet: 100000, enabled: true }
});

function getUser(userId, username = 'Unknown') {
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            username: username,
            balance: 500,
            bank: 0,
            totalGames: 0,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            totalWon: 0,
            lastDaily: null,
            dailyStreak: 0,
            createdAt: Date.now(),
            inventory: []
        };
        saveUsers();
    } else if (username !== 'Unknown') {
        users[userId].username = username;
    }
    if (!users[userId].inventory) {
        users[userId].inventory = [];
    }
    return users[userId];
}

function updateUser(userId, updates) {
    if (users[userId]) {
        Object.assign(users[userId], updates);
        saveUsers();
    }
}

function addBalance(userId, amount) {
    if (users[userId]) {
        users[userId].balance += amount;
        saveUsers();
        return users[userId].balance;
    }
    return 0;
}

function removeBalance(userId, amount) {
    if (users[userId] && users[userId].balance >= amount) {
        users[userId].balance -= amount;
        saveUsers();
        return true;
    }
    return false;
}

function addToBank(userId, amount) {
    if (users[userId] && users[userId].balance >= amount) {
        users[userId].balance -= amount;
        users[userId].bank += amount;
        saveUsers();
        return true;
    }
    return false;
}

function withdrawFromBank(userId, amount) {
    if (users[userId] && users[userId].bank >= amount) {
        users[userId].bank -= amount;
        users[userId].balance += amount;
        saveUsers();
        return true;
    }
    return false;
}

function recordGame(userId, won, betAmount, winAmount = 0) {
    if (users[userId]) {
        users[userId].totalGames++;
        users[userId].totalWagered += betAmount;
        if (won) {
            users[userId].wins++;
            users[userId].totalWon += winAmount;
        } else {
            users[userId].losses++;
        }
        saveUsers();
    }
}

function addHouseProfit(amount) {
    settings.houseProfit += amount;
    saveSettings();
}

function getHouseProfit() {
    return settings.houseProfit;
}

function getTopUsers(limit = 10, sortBy = 'balance') {
    return Object.values(users)
        .sort((a, b) => {
            if (sortBy === 'balance') {
                return (b.balance + b.bank) - (a.balance + a.bank);
            }
            return b.totalWon - a.totalWon;
        })
        .slice(0, limit);
}

function giftGems(fromId, toId, amount) {
    if (users[fromId] && users[fromId].balance >= amount) {
        users[fromId].balance -= amount;
        if (!users[toId]) {
            getUser(toId);
        }
        users[toId].balance += amount;
        saveUsers();
        return true;
    }
    return false;
}

function setLogChannel(channelId) {
    logs.channelId = channelId;
    saveLogs();
}

function getLogChannel() {
    return logs.channelId;
}

function addLog(entry) {
    logs.entries.push({
        ...entry,
        timestamp: Date.now()
    });
    if (logs.entries.length > 1000) {
        logs.entries = logs.entries.slice(-500);
    }
    saveLogs();
}

function createRaffle(creatorId, prize, ticketCost, maxTickets, winners, duration) {
    raffles.active = {
        id: Date.now().toString(),
        creatorId,
        prize,
        ticketCost,
        maxTickets,
        winnersCount: winners,
        duration,
        startTime: Date.now(),
        endTime: Date.now() + duration,
        participants: {},
        totalTickets: 0
    };
    saveRaffles();
    return raffles.active;
}

function getRaffle() {
    return raffles.active;
}

function joinRaffle(userId, username, tickets = 1) {
    if (!raffles.active) return { success: false, reason: 'No active raffle' };
    
    const totalCost = tickets * raffles.active.ticketCost;
    const user = getUser(userId);
    
    if (user.balance < totalCost) {
        return { success: false, reason: 'Insufficient balance' };
    }
    
    if (raffles.active.maxTickets && raffles.active.totalTickets + tickets > raffles.active.maxTickets) {
        return { success: false, reason: 'Not enough tickets available' };
    }
    
    removeBalance(userId, totalCost);
    
    if (!raffles.active.participants[userId]) {
        raffles.active.participants[userId] = { username, tickets: 0 };
    }
    raffles.active.participants[userId].tickets += tickets;
    raffles.active.totalTickets += tickets;
    
    saveRaffles();
    return { success: true, tickets: raffles.active.participants[userId].tickets };
}

function endRaffle() {
    if (!raffles.active) return null;
    
    const participants = Object.entries(raffles.active.participants);
    if (participants.length === 0) {
        const raffle = raffles.active;
        raffles.active = null;
        saveRaffles();
        return { winners: [], raffle };
    }
    
    const ticketPool = [];
    for (const [userId, data] of participants) {
        for (let i = 0; i < data.tickets; i++) {
            ticketPool.push({ userId, username: data.username });
        }
    }
    
    const winners = [];
    const winnerCount = Math.min(raffles.active.winnersCount, ticketPool.length);
    
    for (let i = 0; i < winnerCount; i++) {
        const idx = Math.floor(Math.random() * ticketPool.length);
        winners.push(ticketPool[idx]);
        ticketPool.splice(idx, 1);
    }
    
    const raffle = raffles.active;
    raffles.history.push({
        ...raffle,
        winners,
        endedAt: Date.now()
    });
    
    if (raffles.history.length > 50) {
        raffles.history = raffles.history.slice(-25);
    }
    
    raffles.active = null;
    saveRaffles();
    
    return { winners, raffle };
}

function cancelRaffle() {
    if (!raffles.active) return null;
    
    for (const [userId, data] of Object.entries(raffles.active.participants)) {
        const refund = data.tickets * raffles.active.ticketCost;
        if (users[userId]) {
            users[userId].balance += refund;
        }
    }
    
    const raffle = raffles.active;
    raffles.active = null;
    saveUsers();
    saveRaffles();
    
    return raffle;
}

function getRaffleHistory() {
    return raffles.history;
}

function isAdmin(userId) {
    return settings.adminIds.includes(userId);
}

function addAdmin(userId) {
    if (!settings.adminIds.includes(userId)) {
        settings.adminIds.push(userId);
        saveSettings();
    }
}

function isDailyEnabled() {
    return settings.dailyEnabled !== false;
}

function setDailyEnabled(enabled) {
    settings.dailyEnabled = enabled;
    saveSettings();
}

function createItemRaffle(creatorId, prize, ticketCost, maxTickets, winners, duration) {
    itemRaffles.active = {
        id: Date.now().toString(),
        creatorId,
        prize: prize,
        ticketCost,
        maxTickets,
        winnersCount: winners,
        duration,
        startTime: Date.now(),
        endTime: Date.now() + duration,
        participants: {},
        totalTickets: 0
    };
    saveItemRaffles();
    return itemRaffles.active;
}

function getItemRaffle() {
    return itemRaffles.active;
}

function joinItemRaffle(userId, username, tickets = 1) {
    if (!itemRaffles.active) return { success: false, reason: 'No active item raffle' };
    
    const totalCost = tickets * itemRaffles.active.ticketCost;
    const user = getUser(userId);
    
    if (user.balance < totalCost) {
        return { success: false, reason: 'Insufficient balance' };
    }
    
    if (itemRaffles.active.maxTickets && itemRaffles.active.totalTickets + tickets > itemRaffles.active.maxTickets) {
        return { success: false, reason: 'Not enough tickets available' };
    }
    
    removeBalance(userId, totalCost);
    
    if (!itemRaffles.active.participants[userId]) {
        itemRaffles.active.participants[userId] = { username, tickets: 0 };
    }
    itemRaffles.active.participants[userId].tickets += tickets;
    itemRaffles.active.totalTickets += tickets;
    
    saveItemRaffles();
    return { success: true, tickets: itemRaffles.active.participants[userId].tickets };
}

function endItemRaffle() {
    if (!itemRaffles.active) return null;
    
    const participants = Object.entries(itemRaffles.active.participants);
    if (participants.length === 0) {
        const raffle = itemRaffles.active;
        itemRaffles.active = null;
        saveItemRaffles();
        return { winners: [], raffle };
    }
    
    const ticketPool = [];
    for (const [userId, data] of participants) {
        for (let i = 0; i < data.tickets; i++) {
            ticketPool.push({ userId, username: data.username });
        }
    }
    
    const winners = [];
    const winnerCount = Math.min(itemRaffles.active.winnersCount, ticketPool.length);
    
    for (let i = 0; i < winnerCount; i++) {
        const idx = Math.floor(Math.random() * ticketPool.length);
        winners.push(ticketPool[idx]);
        ticketPool.splice(idx, 1);
    }
    
    for (const winner of winners) {
        addItemToInventory(winner.userId, {
            name: itemRaffles.active.prize.name,
            description: itemRaffles.active.prize.description || 'Won from raffle',
            image: itemRaffles.active.prize.image || null,
            wonAt: Date.now(),
            source: 'raffle'
        });
    }
    
    const raffle = itemRaffles.active;
    itemRaffles.history.push({
        ...raffle,
        winners,
        endedAt: Date.now()
    });
    
    if (itemRaffles.history.length > 50) {
        itemRaffles.history = itemRaffles.history.slice(-25);
    }
    
    itemRaffles.active = null;
    saveItemRaffles();
    
    return { winners, raffle };
}

function cancelItemRaffle() {
    if (!itemRaffles.active) return null;
    
    for (const [userId, data] of Object.entries(itemRaffles.active.participants)) {
        const refund = data.tickets * itemRaffles.active.ticketCost;
        if (users[userId]) {
            users[userId].balance += refund;
        }
    }
    
    const raffle = itemRaffles.active;
    itemRaffles.active = null;
    saveUsers();
    saveItemRaffles();
    
    return raffle;
}

function getItemRaffleHistory() {
    return itemRaffles.history;
}

function addShopItem(item) {
    const newItem = {
        id: shop.nextId++,
        name: item.name,
        description: item.description || '',
        price: item.price,
        stock: item.stock || null,
        image: item.image || null,
        category: item.category || 'General',
        enabled: true,
        createdAt: Date.now()
    };
    shop.items.push(newItem);
    saveShop();
    return newItem;
}

function getShopItems(category = null) {
    let items = shop.items.filter(i => i.enabled);
    if (category) {
        items = items.filter(i => i.category.toLowerCase() === category.toLowerCase());
    }
    return items;
}

function getAllShopItems() {
    return shop.items;
}

function getShopItem(itemId) {
    return shop.items.find(i => i.id === itemId);
}

function updateShopItem(itemId, updates) {
    const idx = shop.items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
        Object.assign(shop.items[idx], updates);
        saveShop();
        return shop.items[idx];
    }
    return null;
}

function removeShopItem(itemId) {
    const idx = shop.items.findIndex(i => i.id === itemId);
    if (idx !== -1) {
        const item = shop.items.splice(idx, 1)[0];
        saveShop();
        return item;
    }
    return null;
}

function buyShopItem(userId, itemId) {
    const item = getShopItem(itemId);
    if (!item || !item.enabled) {
        return { success: false, reason: 'Item not found or unavailable' };
    }
    
    if (item.stock !== null && item.stock <= 0) {
        return { success: false, reason: 'Item out of stock' };
    }
    
    const user = getUser(userId);
    if (user.balance < item.price) {
        return { success: false, reason: 'Insufficient balance' };
    }
    
    removeBalance(userId, item.price);
    
    if (item.stock !== null) {
        item.stock--;
        saveShop();
    }
    
    addItemToInventory(userId, {
        itemId: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price: item.price,
        purchasedAt: Date.now(),
        source: 'shop'
    });
    
    return { success: true, item };
}

function addItemToInventory(userId, item) {
    const user = getUser(userId);
    if (!user.inventory) {
        user.inventory = [];
    }
    user.inventory.push({
        ...item,
        inventoryId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    });
    saveUsers();
    return user.inventory;
}

function getInventory(userId) {
    const user = getUser(userId);
    return user.inventory || [];
}

function removeFromInventory(userId, inventoryId) {
    const user = getUser(userId);
    if (!user.inventory) return null;
    
    const idx = user.inventory.findIndex(i => i.inventoryId === inventoryId);
    if (idx !== -1) {
        const item = user.inventory.splice(idx, 1)[0];
        saveUsers();
        return item;
    }
    return null;
}

function grantItem(userId, item) {
    return addItemToInventory(userId, {
        ...item,
        grantedAt: Date.now(),
        source: 'admin'
    });
}

function getGameSettings(game) {
    return gameSettings[game] || { minBet: 10, maxBet: 100000, enabled: true };
}

function updateGameSettings(game, updates) {
    if (!gameSettings[game]) {
        gameSettings[game] = { minBet: 10, maxBet: 100000, enabled: true };
    }
    Object.assign(gameSettings[game], updates);
    saveGameSettings();
    return gameSettings[game];
}

function getAllGameSettings() {
    return gameSettings;
}

function resetUserBalance(userId) {
    if (users[userId]) {
        users[userId].balance = 500;
        users[userId].bank = 0;
        saveUsers();
        return true;
    }
    return false;
}

function setUserBalance(userId, amount) {
    const user = getUser(userId);
    user.balance = amount;
    saveUsers();
    return user;
}

function getAllUsers() {
    return Object.values(users);
}

function saveUsers() {
    saveJSON(DB_PATH, users);
}

function saveRaffles() {
    saveJSON(RAFFLES_PATH, raffles);
}

function saveLogs() {
    saveJSON(LOGS_PATH, logs);
}

function saveSettings() {
    saveJSON(SETTINGS_PATH, settings);
}

function saveShop() {
    saveJSON(SHOP_PATH, shop);
}

function saveItemRaffles() {
    saveJSON(ITEM_RAFFLES_PATH, itemRaffles);
}

function saveGameSettings() {
    saveJSON(GAME_SETTINGS_PATH, gameSettings);
}

module.exports = {
    getUser,
    updateUser,
    addBalance,
    removeBalance,
    addToBank,
    withdrawFromBank,
    recordGame,
    addHouseProfit,
    getHouseProfit,
    getTopUsers,
    giftGems,
    setLogChannel,
    getLogChannel,
    addLog,
    createRaffle,
    getRaffle,
    joinRaffle,
    endRaffle,
    cancelRaffle,
    getRaffleHistory,
    isAdmin,
    addAdmin,
    isDailyEnabled,
    setDailyEnabled,
    createItemRaffle,
    getItemRaffle,
    joinItemRaffle,
    endItemRaffle,
    cancelItemRaffle,
    getItemRaffleHistory,
    addShopItem,
    getShopItems,
    getAllShopItems,
    getShopItem,
    updateShopItem,
    removeShopItem,
    buyShopItem,
    addItemToInventory,
    getInventory,
    removeFromInventory,
    grantItem,
    getGameSettings,
    updateGameSettings,
    getAllGameSettings,
    resetUserBalance,
    setUserBalance,
    getAllUsers
};
