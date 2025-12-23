const express = require('express');
const router = express.Router();
const db = require('../database/db');
const config = require('../config.json');

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

// Update general settings
router.post('/api/settings/general', (req, res) => {
    try {
        const { dailyEnabled, dailyAmount } = req.body;
        
        if (typeof dailyEnabled !== 'undefined') {
            db.setDailyEnabled(dailyEnabled);
        }
        if (typeof dailyAmount !== 'undefined') {
            config.economy.dailyAmount = dailyAmount;
            const fs = require('fs');
            const path = require('path');
            fs.writeFileSync(path.join(__dirname, '../config.json'), JSON.stringify(config, null, 2));
        }
        
        const settings = {
            dailyEnabled: db.isDailyEnabled(),
            dailyAmount: config.economy?.dailyAmount || 1000
        };
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Update admin role
router.post('/api/settings/admin-role', (req, res) => {
    try {
        const { adminRoleId } = req.body;
        db.setAdminRoleId(adminRoleId || null);
        res.json({ success: true, adminRoleId: db.getAdminRoleId() });
    } catch (error) {
        console.error('Error updating admin role:', error);
        res.status(500).json({ error: 'Failed to update admin role' });
    }
});

// Update channel settings
router.post('/api/settings/channels', (req, res) => {
    try {
        const { depositChannel, withdrawChannel } = req.body;
        
        if (depositChannel !== undefined) {
            db.setDepositChannel(depositChannel || null);
        }
        if (withdrawChannel !== undefined) {
            db.setWithdrawChannel(withdrawChannel || null);
        }
        
        const settings = {
            depositChannel: db.getDepositChannel(),
            withdrawChannel: db.getWithdrawChannel()
        };
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating channels:', error);
        res.status(500).json({ error: 'Failed to update channels' });
    }
});

// Update game settings
router.post('/api/settings/game/:gameName', (req, res) => {
    try {
        const { gameName } = req.params;
        const { minBet, maxBet, enabled, rtp } = req.body;
        
        const gameSettings = db.getGameSettings(gameName);
        if (!gameSettings) {
            return res.status(404).json({ error: 'Game not found' });
        }
        
        const updated = { ...gameSettings };
        if (typeof minBet !== 'undefined') updated.minBet = minBet;
        if (typeof maxBet !== 'undefined') updated.maxBet = maxBet;
        if (typeof enabled !== 'undefined') updated.enabled = enabled;
        if (typeof rtp !== 'undefined') updated.rtp = rtp;
        
        db.updateGameSettings(gameName, updated);
        res.json({ success: true, gameSettings: updated });
    } catch (error) {
        console.error('Error updating game settings:', error);
        res.status(500).json({ error: 'Failed to update game settings' });
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

module.exports = router;
