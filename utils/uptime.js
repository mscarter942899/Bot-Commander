const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const UPTIME_PATH = path.join(__dirname, '../uptime/uptime.json');
let uptimeData = { startTime: null, lastPing: null, pingCount: 0, status: 'offline' };

function loadUptimeData() {
    try {
        if (fs.existsSync(UPTIME_PATH)) {
            uptimeData = JSON.parse(fs.readFileSync(UPTIME_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading uptime data:', e);
    }
}

function saveUptimeData() {
    try {
        const dir = path.dirname(UPTIME_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(UPTIME_PATH, JSON.stringify(uptimeData, null, 2));
    } catch (e) {
        console.error('Error saving uptime data:', e);
    }
}

function startUptimeServer(dashboardApp) {
    const app = dashboardApp || express();
    const PORT = process.env.PORT || 5000;
    
    app.get('/api/uptime', (req, res) => {
        res.json({
            status: 'online',
            uptime: uptimeData.startTime ? Date.now() - uptimeData.startTime : 0,
            pingCount: uptimeData.pingCount,
            lastPing: uptimeData.lastPing,
            bot: 'PS99 Casino Bot'
        });
    });
    
    app.get('/health', (req, res) => {
        res.send('OK');
    });
    
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Uptime server running on port ${PORT}`);
        uptimeData.startTime = Date.now();
        uptimeData.status = 'online';
        saveUptimeData();
    });
    
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.warn(`⚠️ Port ${PORT} already in use, skipping uptime server`);
        } else {
            console.error('Server error:', error);
        }
    });
    
    return app;
}

async function selfPing() {
    const replitDomain = process.env.REPLIT_DEV_DOMAIN;
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
    const port = process.env.PORT || 5000;
    
    let url;
    if (railwayDomain) {
        url = `https://${railwayDomain}`;
    } else if (replitDomain) {
        url = `https://${replitDomain}`;
    } else {
        url = `http://localhost:${port}`;
    }
    
    try {
        await axios.get(url, { timeout: 10000 });
        uptimeData.lastPing = Date.now();
        uptimeData.pingCount++;
        saveUptimeData();
        console.log(`✅ Self-ping #${uptimeData.pingCount} successful`);
    } catch (error) {
        console.log(`⚠️ Self-ping failed, retrying...`);
        setTimeout(selfPing, 30000);
    }
}

function startPingLoop() {
    loadUptimeData();
    setInterval(selfPing, 4 * 60 * 1000);
    setTimeout(selfPing, 10000);
    console.log('🔄 Self-ping loop started (every 4 minutes)');
}

function getUptimeStats() {
    loadUptimeData();
    const uptime = uptimeData.startTime ? Date.now() - uptimeData.startTime : 0;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    
    return {
        formatted: `${hours}h ${minutes}m ${seconds}s`,
        ms: uptime,
        pingCount: uptimeData.pingCount,
        status: uptimeData.status
    };
}

module.exports = {
    startUptimeServer,
    startPingLoop,
    getUptimeStats
};
