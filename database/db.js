const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');
const RAFFLES_PATH = path.join(__dirname, 'raffles.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const SHOP_PATH = path.join(__dirname, 'shop.json');
const ITEM_RAFFLES_PATH = path.join(__dirname, 'itemRaffles.json');
const GAME_SETTINGS_PATH = path.join(__dirname, 'gameSettings.json');
const INVITES_PATH = path.join(__dirname, 'invites.json');
const TRANSACTIONS_PATH = path.join(__dirname, 'transactions.json');

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
let settings = loadJSON(SETTINGS_PATH, { 
    houseProfit: 0, 
    adminIds: [], 
    dailyEnabled: true,
    inviteRewards: { enabled: false, amount: 100, channelId: null, minAccountAge: 60 },
    interest: { enabled: false, rate: 0.01, intervalHours: 24 },
    bigWins: { enabled: false, channelId: null, threshold: 10000 },
    depositChannel: null,
    withdrawChannel: null,
    adminRoleId: null,
    ownerId: '1293548330319872056'
});

if (!settings.adminRoleId) settings.adminRoleId = null;
if (!settings.ownerId) settings.ownerId = '1293548330319872056';
let shop = loadJSON(SHOP_PATH, { items: [], nextId: 1 });
let itemRaffles = loadJSON(ITEM_RAFFLES_PATH, { active: null, history: [] });
let invites = loadJSON(INVITES_PATH, { trackedInvites: {}, claimedRewards: {} });
let gameSettings = loadJSON(GAME_SETTINGS_PATH, {
    slots: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    blackjack: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.98 },
    poker: { minBet: 50, maxBet: 100000, enabled: true, rtp: 0.95 },
    highlow: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    war: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    roulette: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    baccarat: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    crash: { minBet: 10, maxBet: 100000, enabled: true, maxMultiplier: 100, rtp: 0.95 },
    dice: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    mines: { minBet: 10, maxBet: 100000, enabled: true, gridSize: 25, maxMines: 24, rtp: 0.95 },
    coinflip: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    wheel: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.92 },
    plinko: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.94 },
    lottery: { minBet: 100, maxBet: 10000, enabled: true, rtp: 0.90 },
    keno: { minBet: 10, maxBet: 50000, enabled: true, rtp: 0.92 },
    scratcher: { minBet: 50, maxBet: 10000, enabled: true, rtp: 0.90 },
    limbo: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.96 },
    tower: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    hilostreak: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    doubleornothing: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    dragontiger: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    sicbo: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.94 },
    paigow: { minBet: 50, maxBet: 100000, enabled: true, rtp: 0.95 },
    fantan: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    chuckluck: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.92 },
    reddog: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    videopoker: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    horserace: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.92 },
    numberguess: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.94 },
    russianroulette: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 },
    cups: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.90 },
    rps: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.96 },
    wheeloffortune: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.93 },
    fruitslots: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.94 },
    jackpot: { minBet: 100, maxBet: 100000, enabled: true, rtp: 0.90 },
    luckybox: { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.92 }
});

let transactions = loadJSON(TRANSACTIONS_PATH, {
    pendingDeposits: [],
    pendingWithdrawals: [],
    completedDeposits: [],
    completedWithdrawals: [],
    nextId: 1
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

function getInviteSettings() {
    if (!settings.inviteRewards) {
        settings.inviteRewards = { enabled: false, amount: 100, channelId: null, minAccountAge: 60 };
    }
    return settings.inviteRewards;
}

function setInviteSettings(newSettings) {
    settings.inviteRewards = { ...settings.inviteRewards, ...newSettings };
    saveSettings();
    return settings.inviteRewards;
}

function getInterestSettings() {
    if (!settings.interest) {
        settings.interest = { enabled: false, rate: 0.01, intervalHours: 24 };
    }
    return settings.interest;
}

function setInterestSettings(newSettings) {
    settings.interest = { ...settings.interest, ...newSettings };
    saveSettings();
    return settings.interest;
}

function getBigWinsSettings() {
    if (!settings.bigWins) {
        settings.bigWins = { enabled: false, channelId: null, threshold: 10000 };
    }
    return settings.bigWins;
}

function setBigWinsSettings(newSettings) {
    settings.bigWins = { ...settings.bigWins, ...newSettings };
    saveSettings();
    return settings.bigWins;
}

function setDepositChannel(channelId) {
    settings.depositChannel = channelId;
    saveSettings();
}

function getDepositChannel() {
    return settings.depositChannel;
}

function setWithdrawChannel(channelId) {
    settings.withdrawChannel = channelId;
    saveSettings();
}

function getWithdrawChannel() {
    return settings.withdrawChannel;
}

function trackInvite(inviterId, inviteeId, inviteeAccountCreated) {
    if (!invites.trackedInvites[inviterId]) {
        invites.trackedInvites[inviterId] = [];
    }
    invites.trackedInvites[inviterId].push({
        inviteeId,
        inviteeAccountCreated,
        timestamp: Date.now()
    });
    saveInvites();
}

function hasClaimedInviteReward(inviterId, inviteeId) {
    const key = `${inviterId}_${inviteeId}`;
    return !!invites.claimedRewards[key];
}

function markInviteRewardClaimed(inviterId, inviteeId) {
    const key = `${inviterId}_${inviteeId}`;
    invites.claimedRewards[key] = Date.now();
    saveInvites();
}

function hasJoinedBefore(guildId, memberId) {
    const key = `joined_${guildId}_${memberId}`;
    return !!invites.claimedRewards[key];
}

function markAsJoined(guildId, memberId) {
    const key = `joined_${guildId}_${memberId}`;
    invites.claimedRewards[key] = Date.now();
    saveInvites();
}

function getInviteCount(inviterId) {
    if (!invites.trackedInvites[inviterId]) return 0;
    return invites.trackedInvites[inviterId].length;
}

function applyInterest() {
    const interestSettings = getInterestSettings();
    if (!interestSettings.enabled || interestSettings.rate <= 0) return [];
    
    const results = [];
    const now = Date.now();
    const intervalMs = interestSettings.intervalHours * 60 * 60 * 1000;
    
    for (const userId in users) {
        const user = users[userId];
        if (!user.lastInterest) user.lastInterest = now;
        
        if (now - user.lastInterest >= intervalMs && user.bank > 0) {
            const interest = Math.floor(user.bank * interestSettings.rate);
            if (interest > 0) {
                user.bank += interest;
                user.lastInterest = now;
                results.push({ userId, username: user.username, interest, newBank: user.bank });
            }
        }
    }
    
    if (results.length > 0) saveUsers();
    return results;
}

function getAdminRoleId() {
    return settings.adminRoleId;
}

function setAdminRoleId(roleId) {
    settings.adminRoleId = roleId;
    saveSettings();
    return settings.adminRoleId;
}

function getOwnerId() {
    return settings.ownerId || '1293548330319872056';
}

function isOwner(userId) {
    return userId === getOwnerId();
}

function canUseAdminCommands(member) {
    if (!member) return false;
    if (isOwner(member.id)) return true;
    if (member.permissions && member.permissions.has('Administrator')) return true;
    const adminRoleId = getAdminRoleId();
    if (adminRoleId && member.roles && member.roles.cache) {
        return member.roles.cache.has(adminRoleId);
    }
    return false;
}

function getGameRTP(game) {
    const gameSetting = gameSettings[game];
    if (!gameSetting) return 0.95;
    return gameSetting.rtp || 0.95;
}

function setGameRTP(game, rtp) {
    if (!gameSettings[game]) {
        gameSettings[game] = { minBet: 10, maxBet: 100000, enabled: true, rtp: 0.95 };
    }
    gameSettings[game].rtp = rtp;
    saveGameSettings();
    return gameSettings[game];
}

function saveUsers() {
    saveJSON(DB_PATH, users);
}

function saveInvites() {
    saveJSON(INVITES_PATH, invites);
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

function saveTransactions() {
    saveJSON(TRANSACTIONS_PATH, transactions);
}

function createDepositRequest(userId, username, amount, robloxUsername = null) {
    const request = {
        id: transactions.nextId++,
        type: 'deposit',
        userId,
        username,
        amount,
        robloxUsername,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        completedBy: null
    };
    transactions.pendingDeposits.push(request);
    saveTransactions();
    return request;
}

function createWithdrawRequest(userId, username, amount, robloxUsername) {
    const request = {
        id: transactions.nextId++,
        type: 'withdrawal',
        userId,
        username,
        amount,
        robloxUsername,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: null,
        completedBy: null
    };
    transactions.pendingWithdrawals.push(request);
    saveTransactions();
    return request;
}

function getPendingDeposits() {
    return transactions.pendingDeposits;
}

function getPendingWithdrawals() {
    return transactions.pendingWithdrawals;
}

function getPendingDepositById(id) {
    return transactions.pendingDeposits.find(d => d.id === id);
}

function getPendingWithdrawalById(id) {
    return transactions.pendingWithdrawals.find(w => w.id === id);
}

function confirmDeposit(id, staffId, staffUsername, actualAmount = null) {
    const idx = transactions.pendingDeposits.findIndex(d => d.id === id);
    if (idx === -1) return null;
    
    const deposit = transactions.pendingDeposits[idx];
    const finalAmount = actualAmount !== null ? actualAmount : deposit.amount;
    
    const user = getUser(deposit.userId);
    user.balance += finalAmount;
    saveUsers();
    
    deposit.status = 'completed';
    deposit.completedAt = Date.now();
    deposit.completedBy = { id: staffId, username: staffUsername };
    deposit.finalAmount = finalAmount;
    
    transactions.pendingDeposits.splice(idx, 1);
    transactions.completedDeposits.push(deposit);
    
    if (transactions.completedDeposits.length > 100) {
        transactions.completedDeposits = transactions.completedDeposits.slice(-50);
    }
    
    saveTransactions();
    return deposit;
}

function cancelDeposit(id, staffId, staffUsername, reason = null) {
    const idx = transactions.pendingDeposits.findIndex(d => d.id === id);
    if (idx === -1) return null;
    
    const deposit = transactions.pendingDeposits[idx];
    deposit.status = 'cancelled';
    deposit.completedAt = Date.now();
    deposit.completedBy = { id: staffId, username: staffUsername };
    deposit.cancelReason = reason;
    
    transactions.pendingDeposits.splice(idx, 1);
    transactions.completedDeposits.push(deposit);
    
    saveTransactions();
    return deposit;
}

function processWithdrawal(id, staffId, staffUsername) {
    const idx = transactions.pendingWithdrawals.findIndex(w => w.id === id);
    if (idx === -1) return { success: false, reason: 'Withdrawal request not found' };
    
    const withdrawal = transactions.pendingWithdrawals[idx];
    const user = getUser(withdrawal.userId);
    
    if (user.balance < withdrawal.amount) {
        return { success: false, reason: 'User no longer has sufficient balance' };
    }
    
    user.balance -= withdrawal.amount;
    saveUsers();
    
    withdrawal.status = 'completed';
    withdrawal.completedAt = Date.now();
    withdrawal.completedBy = { id: staffId, username: staffUsername };
    
    transactions.pendingWithdrawals.splice(idx, 1);
    transactions.completedWithdrawals.push(withdrawal);
    
    if (transactions.completedWithdrawals.length > 100) {
        transactions.completedWithdrawals = transactions.completedWithdrawals.slice(-50);
    }
    
    saveTransactions();
    return { success: true, withdrawal };
}

function cancelWithdrawal(id, staffId, staffUsername, reason = null) {
    const idx = transactions.pendingWithdrawals.findIndex(w => w.id === id);
    if (idx === -1) return null;
    
    const withdrawal = transactions.pendingWithdrawals[idx];
    withdrawal.status = 'cancelled';
    withdrawal.completedAt = Date.now();
    withdrawal.completedBy = { id: staffId, username: staffUsername };
    withdrawal.cancelReason = reason;
    
    transactions.pendingWithdrawals.splice(idx, 1);
    transactions.completedWithdrawals.push(withdrawal);
    
    saveTransactions();
    return withdrawal;
}

function getUserPendingDeposits(userId) {
    return transactions.pendingDeposits.filter(d => d.userId === userId);
}

function getUserPendingWithdrawals(userId) {
    return transactions.pendingWithdrawals.filter(w => w.userId === userId);
}

function getTransactionHistory(userId, limit = 10) {
    const deposits = transactions.completedDeposits
        .filter(d => d.userId === userId)
        .map(d => ({ ...d, transactionType: 'deposit' }));
    const withdrawals = transactions.completedWithdrawals
        .filter(w => w.userId === userId)
        .map(w => ({ ...w, transactionType: 'withdrawal' }));
    
    return [...deposits, ...withdrawals]
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, limit);
}

function getTotalPendingWithdrawals() {
    return transactions.pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);
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
    getAllUsers,
    getInviteSettings,
    setInviteSettings,
    getInterestSettings,
    setInterestSettings,
    getBigWinsSettings,
    setBigWinsSettings,
    setDepositChannel,
    getDepositChannel,
    setWithdrawChannel,
    getWithdrawChannel,
    trackInvite,
    hasClaimedInviteReward,
    markInviteRewardClaimed,
    hasJoinedBefore,
    markAsJoined,
    getInviteCount,
    applyInterest,
    createDepositRequest,
    createWithdrawRequest,
    getPendingDeposits,
    getPendingWithdrawals,
    getPendingDepositById,
    getPendingWithdrawalById,
    confirmDeposit,
    cancelDeposit,
    processWithdrawal,
    cancelWithdrawal,
    getUserPendingDeposits,
    getUserPendingWithdrawals,
    getTransactionHistory,
    getTotalPendingWithdrawals,
    getAdminRoleId,
    setAdminRoleId,
    getOwnerId,
    isOwner,
    canUseAdminCommands,
    getGameRTP,
    setGameRTP
};
