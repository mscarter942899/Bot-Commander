const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

function getDiceEmoji(value) {
    return DICE_EMOJIS[value - 1];
}

function calculatePayout(betType, dice1, dice2) {
    const total = dice1 + dice2;
    const isDouble = dice1 === dice2;
    
    switch (betType) {
        case 'high': return total >= 8 ? 2 : 0;
        case 'low': return total <= 6 ? 2 : 0;
        case 'seven': return total === 7 ? 4 : 0;
        case 'even': return total % 2 === 0 ? 2 : 0;
        case 'odd': return total % 2 === 1 ? 2 : 0;
        case 'doubles': return isDouble ? 6 : 0;
        default: return 0;
    }
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`dice_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    customId: 'dice',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        
        if (parts[1] === 'again') {
            const bet = parseInt(parts[2]);
            const settings = db.getGameSettings('dice');
            
            if (!settings.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Dice is currently disabled!')], ephemeral: true });
            }
            
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
            }
            
            db.removeBalance(interaction.user.id, bet);
            
            const betTypes = ['high', 'low', 'seven', 'even', 'odd'];
            const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
            
            const dice1 = rollDice();
            const dice2 = rollDice();
            const total = dice1 + dice2;
            
            const payout = calculatePayout(betType, dice1, dice2);
            const winAmount = bet * payout;
            
            if (payout > 0) {
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, bet, winAmount);
            } else {
                db.recordGame(interaction.user.id, false, bet, 0);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🎲 ═══ DICE ═══ 🎲')
                .setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${betType.charAt(0).toUpperCase() + betType.slice(1)}**\n\n`;
            description += `${getDiceEmoji(dice1)} ${getDiceEmoji(dice2)}\n\n`;
            description += `**Result:** ${dice1} + ${dice2} = **${total}**\n\n`;
            
            if (payout > 0) {
                description += `🎉 **YOU WIN!** Won \`${winAmount.toLocaleString()}\` gems (${payout}x)`;
            } else {
                description += `😢 **YOU LOSE** Lost \`${bet.toLocaleString()}\` gems`;
            }
            
            embed.setDescription(description);
            
            await interaction.update({
                embeds: [embed],
                components: [createPlayAgainButton(bet)]
            });
        }
    }
};
