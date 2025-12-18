const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

function getCardValue(card) {
    if (card.value === 'A') return 14;
    if (card.value === 'K') return 13;
    if (card.value === 'Q') return 12;
    if (card.value === 'J') return 11;
    return parseInt(card.value);
}

function evaluateHand(cards) {
    const values = cards.map(c => getCardValue(c)).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = values.every((v, i) => i === 0 || v === values[i - 1] + 1) ||
                       (values.join(',') === '2,3,4,5,14');
    
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const countValues = Object.values(counts).sort((a, b) => b - a);
    
    if (isFlush && isStraight && values[4] === 14 && values[0] === 10) return { hand: 'Royal Flush', multiplier: 250 };
    if (isFlush && isStraight) return { hand: 'Straight Flush', multiplier: 50 };
    if (countValues[0] === 4) return { hand: 'Four of a Kind', multiplier: 25 };
    if (countValues[0] === 3 && countValues[1] === 2) return { hand: 'Full House', multiplier: 9 };
    if (isFlush) return { hand: 'Flush', multiplier: 6 };
    if (isStraight) return { hand: 'Straight', multiplier: 4 };
    if (countValues[0] === 3) return { hand: 'Three of a Kind', multiplier: 3 };
    if (countValues[0] === 2 && countValues[1] === 2) return { hand: 'Two Pair', multiplier: 2 };
    if (countValues[0] === 2 && values.some(v => v >= 11)) return { hand: 'Jacks or Better', multiplier: 1 };
    return { hand: 'No Win', multiplier: 0 };
}

module.exports = {
    customId: 'vp',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const game = client.activeGames?.get(`vp_${interaction.user.id}`);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('Game expired! Start a new game.')], ephemeral: true });
        }
        
        if (action === 'hold') {
            const cardIndex = parseInt(parts[2]);
            if (game.held.includes(cardIndex)) {
                game.held = game.held.filter(i => i !== cardIndex);
            } else {
                game.held.push(cardIndex);
            }
            
            const cardDisplay = game.cards.map((c, i) => {
                const heldMark = game.held.includes(i) ? '🔒' : '  ';
                return `[${c.display}]${heldMark}`;
            }).join(' ');
            
            const embed = new EmbedBuilder()
                .setTitle('🃏 ═══ VIDEO POKER ═══ 🃏')
                .setColor(PS99_COLORS.purple)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n\`\`\`\n${cardDisplay}\n\`\`\`\n\nClick cards to HOLD, then DRAW`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            await interaction.update({ embeds: [embed] });
            
        } else if (action === 'draw') {
            for (let i = 0; i < 5; i++) {
                if (!game.held.includes(i)) {
                    game.cards[i] = game.deck.pop();
                }
            }
            
            const result = evaluateHand(game.cards);
            const winAmount = game.bet * result.multiplier;
            
            const cardDisplay = game.cards.map(c => `[${c.display}]`).join(' ');
            
            const embed = new EmbedBuilder()
                .setTitle('🃏 ═══ VIDEO POKER ═══ 🃏')
                .setColor(result.multiplier > 0 ? PS99_COLORS.success : PS99_COLORS.error)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n\`\`\`\n${cardDisplay}\n\`\`\`\n\n${result.multiplier > 0 ? `🎉 **${result.hand}!** 🎉\nWon: \`${winAmount.toLocaleString()}\` gems (${result.multiplier}x)` : `😢 ${result.hand}`}`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            if (result.multiplier > 0) {
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, game.bet, winAmount);
                db.addHouseProfit(game.bet - winAmount);
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Video Poker', winAmount, result.multiplier);
            } else {
                db.recordGame(interaction.user.id, false, game.bet);
                db.addHouseProfit(game.bet);
            }
            
            client.activeGames.delete(`vp_${interaction.user.id}`);
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
