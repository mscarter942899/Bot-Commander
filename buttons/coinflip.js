const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function flipCoin() {
    return Math.random() < 0.48 ? 'heads' : 'tails';
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`coinflip_heads_${bet}`)
            .setLabel('👑 Heads')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`coinflip_tails_${bet}`)
            .setLabel('🦅 Tails')
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    customId: 'coinflip',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const choice = parts[1];
        const bet = parseInt(parts[2]);
        
        const settings = db.getGameSettings('coinflip');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Coinflip is currently disabled!')], ephemeral: true });
        }
        
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const result = flipCoin();
        const won = choice === result;
        
        if (won) {
            const winAmount = bet * 2;
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
        }
        
        const choiceDisplay = choice === 'heads' ? '👑 Heads' : '🦅 Tails';
        const resultDisplay = result === 'heads' ? '👑 HEADS' : '🦅 TAILS';
        
        const embed = new EmbedBuilder()
            .setTitle('🪙 ═══ COINFLIP ═══ 🪙')
            .setColor(won ? PS99_COLORS.success : PS99_COLORS.error)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${choiceDisplay}**\n\n`;
        description += `**Result:** ${resultDisplay}\n\n`;
        
        if (won) {
            const winAmount = bet * 2;
            description += `🎉 **YOU WIN!**\n\nWon \`${winAmount.toLocaleString()}\` gems (2x)`;
        } else {
            description += `😢 **YOU LOSE**\n\nLost \`${bet.toLocaleString()}\` gems`;
        }
        
        embed.setDescription(description);
        
        await interaction.update({
            embeds: [embed],
            components: [createPlayAgainButton(bet)]
        });
    }
};
