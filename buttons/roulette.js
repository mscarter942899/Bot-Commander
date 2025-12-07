const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { spinWheel, calculatePayout, getNumberColor } = require('../commands/roulette');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`roulette_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

function createRouletteEmbed(bet, betType, betValue, result, spinning) {
    const embed = new EmbedBuilder()
        .setTitle('🎰 ═══ ROULETTE ═══ 🎰')
        .setColor(PS99_COLORS.gold)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const betDisplay = betType === 'number' ? `Number ${betValue}` : betType.charAt(0).toUpperCase() + betType.slice(1);
    const COLOR_EMOJIS = { red: '🔴', black: '⚫', green: '🟢' };
    
    if (spinning) {
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems on ${betDisplay}\n\n🎡 **Spinning the wheel...**`);
    } else {
        const color = getNumberColor(result);
        const colorEmoji = COLOR_EMOJIS[color];
        const payout = calculatePayout(betType, betValue, result);
        const winAmount = bet * payout;
        
        let resultText = payout > 0 
            ? `🎉 **YOU WIN!** 🎉\n\nWon: \`${winAmount.toLocaleString()}\` gems (${payout}x)`
            : `😢 **YOU LOSE**\n\nLost: \`${bet.toLocaleString()}\` gems`;
        
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems on ${betDisplay}\n\n${colorEmoji} **Result: ${result}** (${color.toUpperCase()})\n\n${resultText}`);
        embed.setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error);
    }
    
    return embed;
}

module.exports = {
    customId: 'roulette',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'again') {
            const bet = parseInt(parts[2]);
            const settings = db.getGameSettings('roulette');
            
            if (!settings.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Roulette is currently disabled!')], ephemeral: true });
            }
            
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
            }
            
            db.removeBalance(interaction.user.id, bet);
            
            const betTypes = ['red', 'black', 'even', 'odd', 'high', 'low'];
            const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
            
            await interaction.update({
                embeds: [createRouletteEmbed(bet, betType, null, null, true)],
                components: []
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = spinWheel();
            const payout = calculatePayout(betType, null, result);
            const winAmount = bet * payout;
            
            if (payout > 0) {
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, bet, winAmount);
            } else {
                db.recordGame(interaction.user.id, false, bet, 0);
            }
            
            await interaction.editReply({
                embeds: [createRouletteEmbed(bet, betType, null, result, false)],
                components: [createPlayAgainButton(bet)]
            });
        } else {
            const betType = action;
            const gameId = parts[2];
            
            if (!client.activeGames.has(gameId)) {
                return interaction.reply({ embeds: [createErrorEmbed('This game has expired!')], ephemeral: true });
            }
            
            const game = client.activeGames.get(gameId);
            
            if (game.userId !== interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
            }
        }
    }
};
