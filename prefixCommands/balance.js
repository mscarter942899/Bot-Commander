const db = require('../database/db');
const { createBalanceEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'gems', 'money'],
    description: 'Check your gem balance',
    
    async execute(message, args, client) {
        const targetUser = message.mentions.users.first() || message.author;
        const userData = db.getUser(targetUser.id, targetUser.username);
        
        const embed = createBalanceEmbed(targetUser, userData.balance, userData.bank);
        await message.reply({ embeds: [embed] });
    }
};
