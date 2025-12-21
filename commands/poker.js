const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');
const { createDeck, handToString, handToLargeString, getCardEmoji, getPokerHandRank } = require('../utils/cards');

function createPokerEmbed(playerCards, communityCards, bet, pot, stage = 'preflop', status = 'playing', result = null) {
    let color = PS99_COLORS.gold;
    let statusText = '🎯 Make your move!';
    
    if (status === 'win') {
        color = PS99_COLORS.success;
        statusText = `🎉 YOU WIN! ${result || ''}`;
    } else if (status === 'lose') {
        color = PS99_COLORS.error;
        statusText = `😢 Dealer wins! ${result || ''}`;
    } else if (status === 'fold') {
        color = PS99_COLORS.error;
        statusText = '🏳️ You folded!';
    }
    
    let communityDisplay = '';
    const stages = { preflop: 0, flop: 3, turn: 4, river: 5 };
    const visibleCards = stages[stage] || 0;
    
    if (visibleCards > 0) {
        const visible = communityCards.slice(0, visibleCards).map(c => getCardEmoji(c)).join('  ');
        const hidden = Array(5 - visibleCards).fill('**`[  ?  ]`**').join('  ');
        communityDisplay = `${visible}  ${hidden}`.trim();
    } else {
        communityDisplay = Array(5).fill('**`[  ?  ]`**').join('  ');
    }
    
    const embed = new EmbedBuilder()
        .setTitle('♠️ ═══ TEXAS HOLD\'EM ═══ ♠️')
        .setColor(color)
        .setDescription(`**${statusText}**`)
        .addFields(
            { name: '🎴 Your Hand', value: handToString(playerCards), inline: false },
            { name: '🃏 Community Cards', value: communityDisplay, inline: false },
            { name: '💰 Your Bet', value: `\`${bet.toLocaleString()}\``, inline: true },
            { name: '🏆 Pot', value: `\`${pot.toLocaleString()}\``, inline: true },
            { name: '📍 Stage', value: stage.toUpperCase(), inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    if (status !== 'playing') {
        const playerHand = getPokerHandRank([...playerCards, ...communityCards].slice(0, 7));
        embed.addFields({ name: '🃏 Your Best Hand', value: playerHand.name, inline: false });
    }
    
    return embed;
}

function createPokerButtons(gameId, stage, disabled = false) {
    const buttons = [
        new ButtonBuilder()
            .setCustomId(`poker_call_${gameId}`)
            .setLabel('📞 Call')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`poker_raise_${gameId}`)
            .setLabel('💰 Raise')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`poker_fold_${gameId}`)
            .setLabel('🏳️ Fold')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    ];
    
    return new ActionRowBuilder().addComponents(buttons);
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`poker_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poker')
        .setDescription('Play Texas Hold\'em Poker!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (user.balance < bet * 3) {
            return interaction.reply({ embeds: [createErrorEmbed(`You need at least \`${(bet * 3).toLocaleString()}\` gems to play (for potential raises)! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const deck = createDeck();
        const playerCards = [deck.pop(), deck.pop()];
        const dealerCards = [deck.pop(), deck.pop()];
        const communityCards = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
        
        const gameId = `${interaction.user.id}_${Date.now()}`;
        
        client.activeGames.set(gameId, {
            deck,
            playerCards,
            dealerCards,
            communityCards,
            bet,
            pot: bet * 2,
            stage: 'preflop',
            userId: interaction.user.id,
            username: interaction.user.username
        });
        
        setTimeout(() => client.activeGames.delete(gameId), 600000);
        
        await interaction.reply({
            embeds: [createPokerEmbed(playerCards, communityCards, bet, bet * 2, 'preflop', 'playing')],
            components: [createPokerButtons(gameId, 'preflop', false)]
        });
    }
};

module.exports.createPokerEmbed = createPokerEmbed;
module.exports.createPokerButtons = createPokerButtons;
module.exports.createPlayAgainButton = createPlayAgainButton;
