const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    customId: 'cups',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const game = client.activeGames?.get(`cups_${interaction.user.id}`);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('Game expired! Start a new game.')], ephemeral: true });
        }
        
        if (action === 'pick') {
            const picked = parseInt(parts[2]);
            const won = picked === game.ballPosition;
            
            const cupsReveal = Array(game.numCups).fill('🥤').map((cup, i) => {
                if (i === game.ballPosition) return '⚽';
                if (i === picked && !won) return '❌';
                return '🥤';
            }).join(' ');
            
            const winAmount = won ? Math.floor(game.bet * game.multiplier) : 0;
            
            const embed = new EmbedBuilder()
                .setTitle('🎪 ═══ CUPS GAME ═══ 🎪')
                .setColor(won ? PS99_COLORS.success : PS99_COLORS.error)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n${cupsReveal}\n\n${won ? `🎉 **CORRECT!** You won \`${winAmount.toLocaleString()}\` gems! (${game.multiplier}x)` : `😢 **Wrong cup!** The ball was under cup ${game.ballPosition + 1}`}`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            if (won) {
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, game.bet, winAmount);
                db.addHouseProfit(game.bet - winAmount);
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Cups', winAmount, game.multiplier);
            } else {
                db.recordGame(interaction.user.id, false, game.bet);
                db.addHouseProfit(game.bet);
            }
            
            client.activeGames.delete(`cups_${interaction.user.id}`);
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
