const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');
const RAFFLES_PATH = path.join(__dirname, 'raffles.json');
const LOGS_PATH = path.join(__dirname, 'logs.json');
const SETTINGS_PATH = path.join(__dirname, 'settings.json');

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
            createdAt: Date.now()
        };
        saveUsers();
    } else if (username !== 'Unknown') {
        users[userId].username = username;
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
    setDailyEnabled
};
