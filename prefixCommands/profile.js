const db = require('../database/db');
const { createProfileEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'profile',
    aliases: ['stats', 'me'],
    description: 'View your profile and stats',
    
    async execute(message, args, client) {
        const targetUser = message.mentions.users.first() || message.author;
        const userData = db.getUser(targetUser.id, targetUser.username);
        
        const embed = createProfileEmbed(targetUser, userData);
        await message.reply({ embeds: [embed] });
    }
};
