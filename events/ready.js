const db = require('../database/db');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        client.inviteCache = new Map();
        
        for (const guild of client.guilds.cache.values()) {
            try {
                const invites = await guild.invites.fetch();
                client.inviteCache.set(guild.id, invites);
                console.log(`📧 Cached ${invites.size} invites for ${guild.name}`);
            } catch (error) {
                console.log(`⚠️ Could not fetch invites for ${guild.name}`);
            }
        }

        setInterval(() => {
            const results = db.applyInterest();
            if (results.length > 0) {
                console.log(`💰 Applied interest to ${results.length} users`);
            }
        }, 60 * 60 * 1000);
    }
};
