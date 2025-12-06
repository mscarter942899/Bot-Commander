const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { createDeck, getCardEmoji, compareCards } = require('../utils/cards');

function createHighLowEmbed(currentCard, bet, status = 'playing', result = null, nextCard = null) {
    let color = PS99_COLORS.gold;
    let description = `**Current Card:**\n# ${getCardEmoji(currentCard)}\n\nWill the next card be **Higher** or **Lower**?`;
    
    if (status === 'win' && nextCard) {
        color = PS99_COLORS.success;
        description = `**Your Card:** ${getCardEmoji(currentCard)}\n**Next Card:** ${getCardEmoji(nextCard)}\n\n🎉 **Correct! You WIN!**`;
    } else if (status === 'lose' && nextCard) {
        color = PS99_COLORS.error;
        description = `**Your Card:** ${getCardEmoji(currentCard)}\n**Next Card:** ${getCardEmoji(nextCard)}\n\n😢 **Wrong! You LOSE!**`;
    } else if (status === 'tie' && nextCard) {
        color = PS99_COLORS.info;
        description = `**Your Card:** ${getCardEmoji(currentCard)}\n**Next Card:** ${getCardEmoji(nextCard)}\n\n🤝 **It's a TIE! Bet returned.**`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle('🔮 ═══ HIGHER OR LOWER ═══ 🔮')
        .setColor(color)
        .setDescription(description)
        .addFields(
            { name: '💰 Bet', value: `\`${bet.toLocaleString()}\` gems`, inline: true },
            { name: '📊 Multiplier', value: status === 'win' ? '2x' : '0x', inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    return embed;
}

function createHighLowButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`hl_higher_${gameId}`)
            .setLabel('⬆️ Higher')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`hl_lower_${gameId}`)
            .setLabel('⬇️ Lower')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`hl_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Primary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highlow')
        .setDescription('Guess if the next card is higher or lower!')
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
        const currentCard = deck.pop();
        const nextCard = deck.pop();
        
        const gameId = `${interaction.user.id}_${Date.now()}`;
        
        client.activeGames.set(gameId, {
            currentCard,
            nextCard,
            bet,
            userId: interaction.user.id,
            username: interaction.user.username
        });
        
        setTimeout(() => client.activeGames.delete(gameId), 300000);
        
        await interaction.reply({
            embeds: [createHighLowEmbed(currentCard, bet, 'playing')],
            components: [createHighLowButtons(gameId, false)]
        });
    }
};

module.exports.createHighLowEmbed = createHighLowEmbed;
module.exports.createPlayAgainButton = createPlayAgainButton;
