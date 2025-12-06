const db = require('../database/db');
const { createPS99Embed, PS99_COLORS } = require('../utils/embedBuilder');
const config = require('../config.json');

module.exports = {
    name: 'daily',
    aliases: ['claim'],
    description: 'Claim your daily gems',
    
    async execute(message, args, client) {
        const user = db.getUser(message.author.id, message.author.username);
        const now = Date.now();
        const lastDaily = user.lastDaily || 0;
        const timeSince = now - lastDaily;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (timeSince < oneDay) {
            const timeLeft = oneDay - timeSince;
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            
            const embed = createPS99Embed({
                title: '⏰ Daily Already Claimed',
                color: PS99_COLORS.error,
                description: `You can claim your next daily in **${hours}h ${minutes}m**!`
            });
            return message.reply({ embeds: [embed] });
        }
        
        let streak = user.dailyStreak || 0;
        const twoDays = 2 * oneDay;
        
        if (timeSince < twoDays) {
            streak++;
        } else {
            streak = 1;
        }
        
        const streakBonus = Math.min(streak * 100, 1000);
        const totalReward = config.economy.dailyAmount + streakBonus;
        
        db.addBalance(message.author.id, totalReward);
        db.updateUser(message.author.id, { lastDaily: now, dailyStreak: streak });
        
        const embed = createPS99Embed({
            title: '🎁 Daily Reward Claimed!',
            color: PS99_COLORS.success,
            fields: [
                { name: '💰 Base Reward', value: `\`${config.economy.dailyAmount.toLocaleString()}\` gems`, inline: true },
                { name: '🔥 Streak Bonus', value: `\`${streakBonus.toLocaleString()}\` gems`, inline: true },
                { name: '📊 Total', value: `\`${totalReward.toLocaleString()}\` gems`, inline: true },
                { name: '🔥 Current Streak', value: `\`${streak}\` days`, inline: true }
            ]
        });
        
        await message.reply({ embeds: [embed] });
    }
};
