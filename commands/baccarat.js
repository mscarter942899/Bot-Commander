const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

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

function formatCard(card) {
    return `${card.rank}${card.suit}`;
}

function formatHand(hand) {
    return hand.map(formatCard).join(' ');
}

function shouldPlayerDraw(playerValue) {
    return playerValue <= 5;
}

function shouldBankerDraw(bankerValue, playerThirdCard) {
    if (bankerValue >= 7) return false;
    if (bankerValue <= 2) return true;
    
    if (playerThirdCard === null) {
        return bankerValue <= 5;
    }
    
    const p = getCardValue(playerThirdCard);
    
    switch (bankerValue) {
        case 3: return p !== 8;
        case 4: return p >= 2 && p <= 7;
        case 5: return p >= 4 && p <= 7;
        case 6: return p >= 6 && p <= 7;
        default: return false;
    }
}

function createBaccaratEmbed(playerHand, bankerHand, bet, betType, result = null, playing = true) {
    const playerValue = getHandValue(playerHand);
    const bankerValue = getHandValue(bankerHand);
    
    const embed = new EmbedBuilder()
        .setTitle('🃏 ═══ BACCARAT ═══ 🃏')
        .setColor(PS99_COLORS.purple)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const betDisplay = betType === 'player' ? 'Player' : betType === 'banker' ? 'Banker' : 'Tie';
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${betDisplay}**\n\n`;
    description += `👤 **Player:** ${formatHand(playerHand)} = **${playerValue}**\n`;
    description += `🏦 **Banker:** ${formatHand(bankerHand)} = **${bankerValue}**\n\n`;
    
    if (playing) {
        description += `🎴 *Dealing cards...*`;
    } else {
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
        
        if (winner === 'tie') {
            description += `🤝 **IT'S A TIE!**\n\n`;
        } else if (winner === 'player') {
            description += `👤 **PLAYER WINS!**\n\n`;
        } else {
            description += `🏦 **BANKER WINS!**\n\n`;
        }
        
        if (payout > 0) {
            description += `🎉 **YOU WIN!** Won \`${winAmount.toLocaleString()}\` gems (${payout}x)`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `😢 **You lose** \`${bet.toLocaleString()}\` gems`;
            embed.setColor(PS99_COLORS.error);
        }
    }
    
    embed.setDescription(description);
    return embed;
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
    data: new SlashCommandBuilder()
        .setName('baccarat')
        .setDescription('Play Baccarat!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('hand')
                .setDescription('Which hand to bet on')
                .setRequired(true)
                .addChoices(
                    { name: '👤 Player (2x)', value: 'player' },
                    { name: '🏦 Banker (1.95x)', value: 'banker' },
                    { name: '🤝 Tie (9x)', value: 'tie' }
                )),
    
    async execute(interaction) {
        const settings = db.getGameSettings('baccarat');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Baccarat is currently disabled!')], ephemeral: true });
        }
        
        const bet = interaction.options.getInteger('bet');
        const betType = interaction.options.getString('hand');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Minimum bet is \`${settings.minBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let bankerHand = [deck.pop(), deck.pop()];
        
        await interaction.reply({
            embeds: [createBaccaratEmbed(playerHand, bankerHand, bet, betType, null, true)]
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let playerValue = getHandValue(playerHand);
        let bankerValue = getHandValue(bankerHand);
        
        let playerThirdCard = null;
        
        if (playerValue < 8 && bankerValue < 8) {
            if (shouldPlayerDraw(playerValue)) {
                playerThirdCard = deck.pop();
                playerHand.push(playerThirdCard);
                playerValue = getHandValue(playerHand);
            }
            
            if (shouldBankerDraw(bankerValue, playerThirdCard)) {
                bankerHand.push(deck.pop());
                bankerValue = getHandValue(bankerHand);
            }
        }
        
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
            db.addHouseProfit(bet - winAmount);
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'baccarat',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            betType: betType,
            playerValue: playerValue,
            bankerValue: bankerValue,
            won: payout > 0,
            winAmount: winAmount
        });
        
        await interaction.editReply({
            embeds: [createBaccaratEmbed(playerHand, bankerHand, bet, betType, winner, false)],
            components: [createPlayAgainButton(bet)]
        });
    }
};
