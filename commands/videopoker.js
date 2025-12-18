const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_COLORS = { '♠': 'black', '♥': 'red', '♦': 'red', '♣': 'black' };

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value, display: `${value}${suit}` });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

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

function createVideoPokerEmbed(cards, bet, held = [], result = null, phase = 'deal') {
    const embed = new EmbedBuilder()
        .setTitle('🃏 ═══ VIDEO POKER ═══ 🃏')
        .setColor(PS99_COLORS.purple)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    let cardDisplay = cards.map((c, i) => {
        const heldMark = held.includes(i) ? '🔒' : '  ';
        return `[${c.display}]${heldMark}`;
    }).join(' ');
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems\n\n`;
    description += `\`\`\`\n${cardDisplay}\n\`\`\`\n`;
    
    if (phase === 'deal') {
        description += `Click cards to HOLD, then DRAW`;
    } else if (result) {
        if (result.multiplier > 0) {
            description += `🎉 **${result.hand}!** 🎉\nWon: \`${(bet * result.multiplier).toLocaleString()}\` gems (${result.multiplier}x)`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `😢 ${result.hand}`;
            embed.setColor(PS99_COLORS.error);
        }
    }
    
    embed.setDescription(description);
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('videopoker')
        .setDescription('Play Video Poker - Jacks or Better!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction, client) {
        const bet = interaction.options.getInteger('bet');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('videopoker') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Video Poker is disabled!')], ephemeral: true });
        }
        
        if (bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Minimum bet is \`${settings.minBet}\` gems!`)], ephemeral: true });
        }
        
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Insufficient balance! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const deck = createDeck();
        const cards = deck.splice(0, 5);
        const gameId = Date.now().toString();
        
        client.activeGames = client.activeGames || new Map();
        client.activeGames.set(`vp_${interaction.user.id}`, { cards, deck, bet, held: [] });
        
        const holdButtons = new ActionRowBuilder().addComponents(
            ...cards.map((_, i) => new ButtonBuilder()
                .setCustomId(`vp_hold_${i}_${gameId}`)
                .setLabel(`${i + 1}`)
                .setStyle(ButtonStyle.Secondary))
        );
        
        const actionButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`vp_draw_${gameId}`).setLabel('🔄 Draw').setStyle(ButtonStyle.Primary)
        );
        
        await interaction.reply({
            embeds: [createVideoPokerEmbed(cards, bet, [], null, 'deal')],
            components: [holdButtons, actionButtons]
        });
    }
};
