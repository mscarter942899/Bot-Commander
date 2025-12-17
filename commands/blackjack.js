const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { createDeck, calculateHandValue, handToString, handToLargeString, getCardEmoji } = require('../utils/cards');

function createBlackjackEmbed(playerHand, dealerHand, bet, hideDealer = true, status = 'playing') {
    const playerValue = calculateHandValue(playerHand);
    const dealerValue = hideDealer ? calculateHandValue([dealerHand[1]]) : calculateHandValue(dealerHand);
    
    let color = PS99_COLORS.gold;
    let statusText = '🃏 Your turn - Hit or Stand?';
    
    if (status === 'win') {
        color = PS99_COLORS.success;
        statusText = '🎉 YOU WIN!';
    } else if (status === 'lose') {
        color = PS99_COLORS.error;
        statusText = '😢 YOU LOSE';
    } else if (status === 'push') {
        color = PS99_COLORS.info;
        statusText = '🤝 PUSH - Tie!';
    } else if (status === 'blackjack') {
        color = PS99_COLORS.success;
        statusText = '🎰 BLACKJACK! 2.5x WIN!';
    } else if (status === 'bust') {
        color = PS99_COLORS.error;
        statusText = '💥 BUST! Over 21!';
    }
    
    const playerCards = handToLargeString(playerHand);
    const dealerCards = handToLargeString(dealerHand, hideDealer);
    
    const embed = new EmbedBuilder()
        .setTitle('🃏 ═══ BLACKJACK ═══ 🃏')
        .setColor(color)
        .setDescription(`**${statusText}**\n\n💰 **Bet:** \`${bet.toLocaleString()}\` gems`)
        .addFields(
            { 
                name: `🎴 Your Hand (Value: ${playerValue})`, 
                value: playerCards, 
                inline: false 
            },
            { 
                name: `🎴 Dealer Hand (Value: ${hideDealer ? '?' : calculateHandValue(dealerHand)})`, 
                value: dealerCards, 
                inline: false 
            }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    return embed;
}

function createBlackjackButtons(gameId, canDouble = true, disabled = false) {
    const buttons = [
        new ButtonBuilder()
            .setCustomId(`bj_hit_${gameId}`)
            .setLabel('🎴 Hit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`bj_stand_${gameId}`)
            .setLabel('✋ Stand')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ];
    
    if (canDouble) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`bj_double_${gameId}`)
                .setLabel('💰 Double')
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled)
        );
    }
    
    buttons.push(
        new ButtonBuilder()
            .setCustomId(`bj_surrender_${gameId}`)
            .setLabel('🏳️ Surrender')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
    
    return new ActionRowBuilder().addComponents(buttons);
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`bj_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play blackjack against the dealer!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction, client) {
        const bet = interaction.options.getInteger('bet');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const deck = createDeck();
        const playerHand = [deck.pop(), deck.pop()];
        const dealerHand = [deck.pop(), deck.pop()];
        
        const gameId = `${interaction.user.id}_${Date.now()}`;
        const playerValue = calculateHandValue(playerHand);
        
        if (playerValue === 21) {
            const dealerValue = calculateHandValue(dealerHand);
            
            if (dealerValue === 21) {
                db.addBalance(interaction.user.id, bet);
                db.recordGame(interaction.user.id, false, bet, 0);
                
                return interaction.reply({
                    embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, false, 'push')],
                    components: [createPlayAgainButton(bet)]
                });
            }
            
            const winAmount = Math.floor(bet * 2.5);
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Blackjack', winAmount, 2.5);
            
            db.addLog({
                type: 'blackjack',
                userId: interaction.user.id,
                username: interaction.user.username,
                bet: bet,
                won: true,
                winAmount: winAmount,
                result: 'Blackjack'
            });
            
            return interaction.reply({
                embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, false, 'blackjack')],
                components: [createPlayAgainButton(bet)]
            });
        }
        
        client.activeGames.set(gameId, {
            deck,
            playerHand,
            dealerHand,
            bet,
            doubled: false,
            userId: interaction.user.id,
            username: interaction.user.username
        });
        
        setTimeout(() => client.activeGames.delete(gameId), 300000);
        
        await interaction.reply({
            embeds: [createBlackjackEmbed(playerHand, dealerHand, bet, true, 'playing')],
            components: [createBlackjackButtons(gameId, user.balance >= bet, false)]
        });
    }
};

module.exports.createBlackjackEmbed = createBlackjackEmbed;
module.exports.createBlackjackButtons = createBlackjackButtons;
module.exports.createPlayAgainButton = createPlayAgainButton;
