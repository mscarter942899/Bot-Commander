const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function getCardValue(card) {
    if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 0;
    if (card.rank === 'A') return 1;
    return parseInt(card.rank);
}

function getHandValue(hand) {
    return hand.reduce((sum, card) => sum + getCardValue(card), 0) % 10;
}

function formatHand(hand) {
    return hand.map(c => `${c.rank}${c.suit}`).join(' ');
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`baccarat_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    customId: 'baccarat',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        
        if (parts[1] === 'again') {
            const bet = parseInt(parts[2]);
            const settings = db.getGameSettings('baccarat');
            
            if (!settings.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Baccarat is currently disabled!')], ephemeral: true });
            }
            
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
            }
            
            db.removeBalance(interaction.user.id, bet);
            
            const betTypes = ['player', 'banker', 'tie'];
            const betType = betTypes[Math.floor(Math.random() * 2)];
            
            const deck = createDeck();
            let playerHand = [deck.pop(), deck.pop()];
            let bankerHand = [deck.pop(), deck.pop()];
            
            const playerValue = getHandValue(playerHand);
            const bankerValue = getHandValue(bankerHand);
            
            let winner;
            if (playerValue > bankerValue) winner = 'player';
            else if (bankerValue > playerValue) winner = 'banker';
            else winner = 'tie';
            
            let payout = 0;
            if (betType === winner) {
                if (betType === 'player') payout = 2;
                else if (betType === 'banker') payout = 1.95;
                else if (betType === 'tie') payout = 9;
            }
            
            const winAmount = Math.floor(bet * payout);
            
            if (payout > 0) {
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, bet, winAmount);
            } else {
                db.recordGame(interaction.user.id, false, bet, 0);
            }
            
            const embed = new EmbedBuilder()
                .setTitle('🃏 ═══ BACCARAT ═══ 🃏')
                .setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${betType.charAt(0).toUpperCase() + betType.slice(1)}**\n\n`;
            description += `👤 **Player:** ${formatHand(playerHand)} = **${playerValue}**\n`;
            description += `🏦 **Banker:** ${formatHand(bankerHand)} = **${bankerValue}**\n\n`;
            
            if (winner === 'tie') description += `🤝 **IT'S A TIE!**\n\n`;
            else if (winner === 'player') description += `👤 **PLAYER WINS!**\n\n`;
            else description += `🏦 **BANKER WINS!**\n\n`;
            
            if (payout > 0) {
                description += `🎉 **YOU WIN!** Won \`${winAmount.toLocaleString()}\` gems (${payout}x)`;
            } else {
                description += `😢 **You lose** \`${bet.toLocaleString()}\` gems`;
            }
            
            embed.setDescription(description);
            
            await interaction.update({
                embeds: [embed],
                components: [createPlayAgainButton(bet)]
            });
        }
    }
};
