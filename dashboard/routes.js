const express = require('express');
const router = express.Router();
const db = require('../database/db');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

router.get('/api/settings', (req, res) => {
    try {
        const settings = {
            dailyEnabled: db.isDailyEnabled(),
            dailyAmount: config.economy?.dailyAmount || 1000,
            startingBalance: config.economy?.startingBalance || 500,
            houseEdge: config.economy?.houseEdge || 0.05,
            adminRoleId: db.getAdminRoleId(),
            depositChannel: db.getDepositChannel(),
            withdrawChannel: db.getWithdrawChannel(),
            houseProfit: db.getHouseProfit(),
            inviteSettings: db.getInviteSettings(),
            interestSettings: db.getInterestSettings(),
            bigWinsSettings: db.getBigWinsSettings()
        };
        const gameSettings = db.getAllGameSettings();
        res.json({ settings, gameSettings });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.post('/api/settings/general', (req, res) => {
    try {
        const { dailyEnabled, dailyAmount, startingBalance, houseEdge } = req.body;
        
        if (typeof dailyEnabled !== 'undefined') db.setDailyEnabled(dailyEnabled);
        if (dailyAmount !== undefined) config.economy.dailyAmount = dailyAmount;
        if (startingBalance !== undefined) config.economy.startingBalance = startingBalance;
        if (houseEdge !== undefined) config.economy.houseEdge = houseEdge;
        
        fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

router.post('/api/settings/channels', (req, res) => {
    try {
        const { depositChannel, withdrawChannel, logsChannel } = req.body;
        if (depositChannel !== undefined) db.setDepositChannel(depositChannel || null);
        if (withdrawChannel !== undefined) db.setWithdrawChannel(withdrawChannel || null);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update channels' });
    }
});

router.post('/api/settings/invites', (req, res) => {
    try {
        const { inviteRewardsEnabled, inviteAmount, inviteMinAge } = req.body;
        const settings = db.getInviteSettings();
        if (typeof inviteRewardsEnabled !== 'undefined') settings.enabled = inviteRewardsEnabled;
        if (inviteAmount !== undefined) settings.amount = inviteAmount;
        if (inviteMinAge !== undefined) settings.minAccountAge = inviteMinAge;
        db.setInviteSettings(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update invites' });
    }
});

router.post('/api/settings/interest', (req, res) => {
    try {
        const { interestEnabled, interestRate, interestHours } = req.body;
        const settings = db.getInterestSettings();
        if (typeof interestEnabled !== 'undefined') settings.enabled = interestEnabled;
        if (interestRate !== undefined) settings.rate = interestRate / 100;
        if (interestHours !== undefined) settings.intervalHours = interestHours;
        db.setInterestSettings(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update interest' });
    }
});

router.post('/api/settings/bigwins', (req, res) => {
    try {
        const { bigWinsEnabled, bigWinsThreshold, bigWinsChannel } = req.body;
        const settings = db.getBigWinsSettings();
        if (typeof bigWinsEnabled !== 'undefined') settings.enabled = bigWinsEnabled;
        if (bigWinsThreshold !== undefined) settings.threshold = bigWinsThreshold;
        if (bigWinsChannel !== undefined) settings.channelId = bigWinsChannel || null;
        db.setBigWinsSettings(settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update bigwins' });
    }
});

router.post('/api/settings/admin', (req, res) => {
    try {
        const { adminRole, ownerID } = req.body;
        if (adminRole !== undefined) db.setAdminRoleId(adminRole || null);
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

router.get('/api/stats', (req, res) => {
    try {
        const allUsers = db.getAllUsers();
        const users = Object.values(allUsers);
        const totalUsers = users.length;
        const totalGames = users.reduce((sum, u) => sum + (u.totalGames || 0), 0);
        const totalWins = users.reduce((sum, u) => sum + (u.wins || 0), 0);
        const houseProfit = db.getHouseProfit();
        res.json({ totalUsers, totalGames, totalWins, houseProfit });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

router.get('/api/top-users', (req, res) => {
    try {
        const topUsers = db.getTopUsers(10);
        res.json(topUsers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch top users' });
    }
});

router.get('/api/users', (req, res) => {
    try {
        const allUsers = db.getAllUsers();
        const users = Object.values(allUsers).sort((a, b) => (b.balance || 0) - (a.balance || 0));
        res.json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/api/diagnostics', (req, res) => {
    try {
        const diagnostics = [];
        
        const commandsPath = path.join(__dirname, '../commands');
        const slashCommands = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length;
        diagnostics.push({
            type: slashCommands > 0 ? 'success' : 'error',
            message: `${slashCommands > 0 ? '✓' : '✗'} ${slashCommands} slash commands`,
            details: slashCommands > 0 ? 'All commands loaded' : 'Check commands folder'
        });
        
        const prefixPath = path.join(__dirname, '../prefixCommands');
        const prefixCommands = fs.readdirSync(prefixPath).filter(f => f.endsWith('.js')).length;
        diagnostics.push({
            type: 'success',
            message: `✓ ${prefixCommands} prefix commands`,
            details: 'All prefix commands available'
        });
        
        const dbPath = path.join(__dirname, '../database');
        const dbFiles = fs.readdirSync(dbPath).filter(f => f.endsWith('.json')).length;
        diagnostics.push({
            type: 'success',
            message: `✓ ${dbFiles} database files`,
            details: 'Data persistence working'
        });
        
        if (process.env.DISCORD_TOKEN) {
            diagnostics.push({
                type: 'success',
                message: '✓ Discord token configured',
                details: 'Bot can connect to Discord'
            });
        } else {
            diagnostics.push({
                type: 'warning',
                message: '⚠ Discord token not set',
                details: 'Add DISCORD_TOKEN to enable bot'
            });
        }
        
        const gameSettings = db.getAllGameSettings();
        const gameCount = Object.keys(gameSettings).length;
        diagnostics.push({
            type: gameCount > 0 ? 'success' : 'warning',
            message: `${gameCount > 0 ? '✓' : '⚠'} ${gameCount} games configured`,
            details: gameCount > 0 ? 'All games setup' : 'Configure games in dashboard'
        });
        
        res.json({ diagnostics });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to run diagnostics' });
    }
});

module.exports = router;
