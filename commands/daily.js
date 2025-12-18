const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS } = require('../utils/embedBuilder');
const config = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily gems'),
    
    async execute(interaction) {
        if (!db.isDailyEnabled()) {
            const embed = createPremiumEmbed({
                title: 'Daily Rewards Disabled',
                titleIcon: '🚫',
                color: PS99_COLORS.error,
                description: '```diff\n- Temporarily Disabled -```\n\nDaily rewards are currently disabled by an administrator.',
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
            
            const embed = createPremiumEmbed({
                title: 'Already Claimed',
                titleIcon: '⏰',
                color: PS99_COLORS.error,
                description: `\`\`\`diff\n- Come Back Later -\`\`\`\n\nYou can claim your next daily in:\n\n⏰ **${hours}h ${minutes}m**`,
                footer: 'Patience pays off!'
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
        
        const streakBar = '🔥'.repeat(Math.min(streak, 10));
        const maxStreak = streak >= 10;
        
        const embed = new EmbedBuilder()
            .setTitle(`${ICONS.gift} DAILY REWARD ${ICONS.gift}`)
            .setColor(maxStreak ? PS99_COLORS.rainbow : PS99_COLORS.success)
            .setDescription(`\`\`\`\n╔═══════════════════════════════════╗\n║      ✨ REWARDS CLAIMED! ✨      ║\n╚═══════════════════════════════════╝\`\`\``)
            .addFields(
                { name: `${ICONS.money} Base Reward`, value: `\`\`\`diff\n+ ${config.economy.dailyAmount.toLocaleString()} gems\`\`\``, inline: true },
                { name: `${ICONS.fire} Streak Bonus`, value: `\`\`\`yaml\n+ ${streakBonus.toLocaleString()} gems\`\`\``, inline: true },
                { name: `${ICONS.gem} Total`, value: `\`\`\`fix\n${totalReward.toLocaleString()} gems\`\`\``, inline: true },
                { name: `${ICONS.fire} Current Streak`, value: `\`${streak} days\`\n${streakBar}${maxStreak ? ' MAX!' : ''}`, inline: false }
            )
            .setFooter({ text: `${ICONS.gem} PS99 Casino ${ICONS.gem} | Come back tomorrow for more!` })
            .setTimestamp();
        
        if (maxStreak) {
            embed.addFields({ name: '👑 Max Streak Achieved!', value: 'You\'re getting the maximum bonus!', inline: false });
        }
        
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
