const db = require('../database/db');
const { createLeaderboardEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'top',
    aliases: ['leaderboard', 'lb', 'rich'],
    description: 'View the leaderboard',
    
    async execute(message, args, client) {
        const type = args[0] === 'wins' ? 'winnings' : 'balance';
        const topUsers = db.getTopUsers(10, type);
        const embed = createLeaderboardEmbed(topUsers, type);
        
        await message.reply({ embeds: [embed] });
    }
};
