const express = require('express');
const router = express.Router();
const db = require('../database/db');
const config = require('../config.json');
const fs = require('fs');
const path = require('path');

// Get all settings
router.get('/api/settings', (req, res) => {
    try {
        const settings = {
            dailyEnabled: db.isDailyEnabled(),
            dailyAmount: config.economy?.dailyAmount || 1000,
            adminRoleId: db.getAdminRoleId(),
            depositChannel: db.getDepositChannel(),
            withdrawChannel: db.getWithdrawChannel(),
            inviteSettings: db.getInviteSettings(),
            interestSettings: db.getInterestSettings(),
            bigWinsSettings: db.getBigWinsSettings()
        };
        const gameSettings = db.getAllGameSettings();
        res.json({ settings, gameSettings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Save general settings
router.post('/api/settings/general', (req, res) => {
    try {
        const { dailyEnabled, dailyAmount } = req.body;
        
        if (typeof dailyEnabled !== 'undefined') {
            db.setDailyEnabled(dailyEnabled);
        }
        if (typeof dailyAmount !== 'undefined') {
            config.economy.dailyAmount = dailyAmount;
            fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2));
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Save channel settings
router.post('/api/settings/channels', (req, res) => {
    try {
        const { depositChannel, withdrawChannel } = req.body;
        
        if (depositChannel !== undefined) {
            db.setDepositChannel(depositChannel || null);
        }
        if (withdrawChannel !== undefined) {
            db.setWithdrawChannel(withdrawChannel || null);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating channels:', error);
        res.status(500).json({ error: 'Failed to update channels' });
    }
});

// Save feature settings
router.post('/api/settings/features', (req, res) => {
    try {
        const { adminRoleId, inviteRewardsEnabled, inviteAmount } = req.body;
        
        if (adminRoleId !== undefined) {
            db.setAdminRoleId(adminRoleId || null);
        }
        
        const inviteSettings = db.getInviteSettings();
        if (typeof inviteRewardsEnabled !== 'undefined') {
            inviteSettings.enabled = inviteRewardsEnabled;
        }
        if (inviteAmount !== undefined) {
            inviteSettings.amount = inviteAmount;
        }
        db.setInviteSettings(inviteSettings);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating features:', error);
        res.status(500).json({ error: 'Failed to update features' });
    }
});

// Get statistics
router.get('/api/stats', (req, res) => {
    try {
        const allUsers = db.getAllUsers();
        const users = Object.values(allUsers);
        
        const totalUsers = users.length;
        const totalGames = users.reduce((sum, u) => sum + (u.totalGames || 0), 0);
        const totalWins = users.reduce((sum, u) => sum + (u.wins || 0), 0);
        const houseProfit = db.getHouseProfit();
        
        res.json({
            totalUsers,
            totalGames,
            totalWins,
            houseProfit,
            avgBalancePerUser: users.length > 0 ? users.reduce((sum, u) => sum + (u.balance || 0), 0) / users.length : 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get top users
router.get('/api/top-users', (req, res) => {
    try {
        const topUsers = db.getTopUsers(10);
        res.json(topUsers);
    } catch (error) {
        console.error('Error fetching top users:', error);
        res.status(500).json({ error: 'Failed to fetch top users' });
    }
});

// Get all users
router.get('/api/users', (req, res) => {
    try {
        const allUsers = db.getAllUsers();
        const users = Object.values(allUsers).sort((a, b) => (b.balance || 0) - (a.balance || 0));
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get shop items
router.get('/api/shop', (req, res) => {
    try {
        const items = db.getAllShopItems();
        res.json(items);
    } catch (error) {
        console.error('Error fetching shop items:', error);
        res.status(500).json({ error: 'Failed to fetch shop items' });
    }
});

// Run diagnostics
router.get('/api/diagnostics', (req, res) => {
    try {
        const diagnostics = [];
        
        // Check commands
        const commandsPath = path.join(__dirname, '../commands');
        const slashCommands = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length;
        if (slashCommands > 0) {
            diagnostics.push({
                type: 'success',
                message: `✓ ${slashCommands} slash commands loaded`,
                details: 'All slash commands are available'
            });
        } else {
            diagnostics.push({
                type: 'error',
                message: '✗ No slash commands found',
                details: 'Check the commands directory'
            });
        }
        
        // Check prefix commands
        const prefixPath = path.join(__dirname, '../prefixCommands');
        const prefixCommands = fs.readdirSync(prefixPath).filter(f => f.endsWith('.js')).length;
        if (prefixCommands > 0) {
            diagnostics.push({
                type: 'success',
                message: `✓ ${prefixCommands} prefix commands loaded`,
                details: 'All prefix commands are available'
            });
        }
        
        // Check database files
        const dbPath = path.join(__dirname, '../database');
        const dbFiles = fs.readdirSync(dbPath).filter(f => f.endsWith('.json')).length;
        diagnostics.push({
            type: 'success',
            message: `✓ ${dbFiles} database files found`,
            details: 'All data is being persisted'
        });
        
        // Check config
        if (fs.existsSync(path.join(__dirname, '../config.json'))) {
            diagnostics.push({
                type: 'success',
                message: '✓ Config file present',
                details: 'Configuration loaded successfully'
            });
        } else {
            diagnostics.push({
                type: 'error',
                message: '✗ Config file missing',
                details: 'Create config.json in root directory'
            });
        }
        
        // Check user data
        const allUsers = db.getAllUsers();
        const userCount = Object.keys(allUsers).length;
        diagnostics.push({
            type: 'success',
            message: `✓ ${userCount} users in database`,
            details: 'User data is being tracked'
        });
        
        // Check game settings
        const gameSettings = db.getAllGameSettings();
        const gameCount = Object.keys(gameSettings).length;
        if (gameCount > 0) {
            diagnostics.push({
                type: 'success',
                message: `✓ ${gameCount} games configured`,
                details: 'All game settings are configured'
            });
        } else {
            diagnostics.push({
                type: 'warning',
                message: '⚠ No games configured',
                details: 'Set up game settings in the dashboard'
            });
        }
        
        // Check if DISCORD_TOKEN is set
        if (process.env.DISCORD_TOKEN) {
            diagnostics.push({
                type: 'success',
                message: '✓ Discord token is set',
                details: 'Bot can connect to Discord'
            });
        } else {
            diagnostics.push({
                type: 'warning',
                message: '⚠ Discord token not set',
                details: 'Add DISCORD_TOKEN to environment variables to enable bot'
            });
        }
        
        res.json({ diagnostics });
    } catch (error) {
        console.error('Error running diagnostics:', error);
        res.status(500).json({ error: 'Failed to run diagnostics' });
    }
});

module.exports = router;
