const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const CHOICES = {
    rock: { emoji: '🪨', beats: 'scissors', name: 'Rock' },
    paper: { emoji: '📄', beats: 'rock', name: 'Paper' },
    scissors: { emoji: '✂️', beats: 'paper', name: 'Scissors' }
};

module.exports = {
    customId: 'rps',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const choice = parts[1];
        const game = client.activeGames?.get(`rps_${interaction.user.id}`);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('Game expired! Start a new game.')], ephemeral: true });
        }
        
        const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
        
        let result, winAmount = 0;
        if (choice === botChoice) {
            result = 'tie';
            winAmount = game.bet;
        } else if (CHOICES[choice].beats === botChoice) {
            result = 'win';
            winAmount = game.bet * 2;
        } else {
            result = 'lose';
        }
        
        const embed = new EmbedBuilder()
            .setTitle('✂️ ═══ ROCK PAPER SCISSORS ═══ 🪨')
            .setColor(result === 'win' ? PS99_COLORS.success : (result === 'tie' ? PS99_COLORS.gold : PS99_COLORS.error))
            .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n**You:** ${CHOICES[choice].emoji} ${CHOICES[choice].name}\n**Bot:** ${CHOICES[botChoice].emoji} ${CHOICES[botChoice].name}\n\n${result === 'win' ? `🎉 **YOU WIN!** Won \`${winAmount.toLocaleString()}\` gems!` : result === 'tie' ? `🤝 **TIE!** Money back: \`${winAmount.toLocaleString()}\` gems` : `😢 **YOU LOSE!** Lost \`${game.bet.toLocaleString()}\` gems`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        if (result === 'win') {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
            db.addHouseProfit(game.bet - winAmount);
        } else if (result === 'tie') {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
        } else {
            db.recordGame(interaction.user.id, false, game.bet);
            db.addHouseProfit(game.bet);
        }
        
        client.activeGames.delete(`rps_${interaction.user.id}`);
        await interaction.update({ embeds: [embed], components: [] });
    }
};
