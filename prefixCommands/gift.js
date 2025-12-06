const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'gift',
    aliases: ['give', 'pay'],
    description: 'Gift gems to another user',
    
    async execute(message, args, client) {
        const targetUser = message.mentions.users.first();
        const amount = parseInt(args[1] || args[0]);
        
        if (!targetUser) {
            return message.reply({ embeds: [createErrorEmbed('Please mention a user! Usage: `!gift @user amount`')] });
        }
        
        if (isNaN(amount) || amount <= 0) {
            return message.reply({ embeds: [createErrorEmbed('Please enter a valid amount!')] });
        }
        
        if (targetUser.id === message.author.id) {
            return message.reply({ embeds: [createErrorEmbed('You cannot gift gems to yourself!')] });
        }
        
        const sender = db.getUser(message.author.id, message.author.username);
        if (sender.balance < amount) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        db.getUser(targetUser.id, targetUser.username);
        db.giftGems(message.author.id, targetUser.id, amount);
        
        const embed = createPS99Embed({
            title: '🎁 Gift Sent!',
            color: PS99_COLORS.success,
            description: `You gifted **${amount.toLocaleString()}** gems to ${targetUser}!`
        });
        
        await message.reply({ embeds: [embed] });
    }
};
