const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS } = require('../utils/embedBuilder');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily gems'),
    
    async execute(interaction) {
        if (!db.isDailyEnabled()) {
            const embed = createPS99Embed({
                title: '🚫 Daily Rewards Disabled',
                color: PS99_COLORS.error,
                description: 'Daily rewards are currently disabled by an administrator.',
                footer: 'Check back later!'
            });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        const user = db.getUser(interaction.user.id, interaction.user.username);
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
                description: `You can claim your next daily in **${hours}h ${minutes}m**!`,
                footer: 'Come back later!'
            });
            return interaction.reply({ embeds: [embed], ephemeral: true });
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
        
        db.addBalance(interaction.user.id, totalReward);
        db.updateUser(interaction.user.id, { lastDaily: now, dailyStreak: streak });
        
        const embed = createPS99Embed({
            title: '🎁 Daily Reward Claimed!',
            color: PS99_COLORS.success,
            fields: [
                { name: '💰 Base Reward', value: `\`${config.economy.dailyAmount.toLocaleString()}\` gems`, inline: true },
                { name: '🔥 Streak Bonus', value: `\`${streakBonus.toLocaleString()}\` gems`, inline: true },
                { name: '📊 Total', value: `\`${totalReward.toLocaleString()}\` gems`, inline: true },
                { name: '🔥 Current Streak', value: `\`${streak}\` days`, inline: true }
            ],
            footer: 'Come back tomorrow to continue your streak!'
        });
        
        db.addLog({
            type: 'daily',
            userId: interaction.user.id,
            username: interaction.user.username,
            amount: totalReward,
            streak: streak
        });
        
        await interaction.reply({ embeds: [embed] });
    }
};
