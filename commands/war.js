const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { createDeck, getCardEmoji, getSingleBigCard, compareCards } = require('../utils/cards');

function createWarEmbed(playerCard, dealerCard, bet, status = 'playing', revealed = false) {
    let color = PS99_COLORS.gold;
    let statusText;
    let cardsDisplay;
    
    if (!revealed) {
        statusText = '⚔️ Press **Reveal** to see who wins!';
        cardsDisplay = `**Your Card:**\n${getSingleBigCard(playerCard)}\n**Dealer's Card:**\n${getSingleBigCard(null, true)}`;
    } else {
        if (status === 'win') {
            color = PS99_COLORS.success;
            statusText = '🎉 **YOU WIN!**';
        } else if (status === 'lose') {
            color = PS99_COLORS.error;
            statusText = '😢 **YOU LOSE!**';
        } else {
            color = PS99_COLORS.info;
            statusText = '🤝 **TIE! Going to WAR...**';
        }
        cardsDisplay = `**Your Card:**\n${getSingleBigCard(playerCard)}\n**Dealer's Card:**\n${getSingleBigCard(dealerCard)}`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('⚔️ ═══ WAR ═══ ⚔️')
        .setColor(color)
        .setDescription(`${statusText}\n\n${cardsDisplay}`)
        .addFields(
            { name: '💰 Bet', value: `\`${bet.toLocaleString()}\` gems`, inline: true },
            { name: '📊 Multiplier', value: status === 'win' ? '**2x**' : '0x', inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    return embed;
}

function createRevealButton(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`war_reveal_${gameId}`)
            .setLabel('⚔️ Reveal!')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled)
    );
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`war_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('war')
        .setDescription('Play War against the dealer!')
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
        const playerCard = deck.pop();
        let dealerCard = deck.pop();
        
        const rigChance = Math.random();
        if (rigChance < 0.55) {
            const playerValue = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(playerCard.rank);
            const higherCards = deck.filter(c => {
                const dealerValue = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].indexOf(c.rank);
                return dealerValue > playerValue;
            });
            if (higherCards.length > 0) {
                dealerCard = higherCards[Math.floor(Math.random() * higherCards.length)];
            }
        }
        
        const gameId = `${interaction.user.id}_${Date.now()}`;
        
        client.activeGames.set(gameId, {
            playerCard,
            dealerCard,
            bet,
            userId: interaction.user.id,
            username: interaction.user.username
        });
        
        setTimeout(() => client.activeGames.delete(gameId), 300000);
        
        await interaction.reply({
            embeds: [createWarEmbed(playerCard, dealerCard, bet, 'playing', false)],
            components: [createRevealButton(gameId, false)]
        });
    }
};

module.exports.createWarEmbed = createWarEmbed;
module.exports.createPlayAgainButton = createPlayAgainButton;
