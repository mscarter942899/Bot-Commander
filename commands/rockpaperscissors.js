const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

const CHOICES = {
    rock: { emoji: '🪨', beats: 'scissors', name: 'Rock' },
    paper: { emoji: '📄', beats: 'rock', name: 'Paper' },
    scissors: { emoji: '✂️', beats: 'paper', name: 'Scissors' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Rock Paper Scissors!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., "1000", "5m", "2.5b")')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const bet = parseGemAmount(interaction.options.getString('bet'));
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('rps') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('RPS is disabled!')], ephemeral: true });
        }
        
        if (bet <= 0 || bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Please enter a valid bet (minimum: \`${settings.minBet}\` gems)!`)], ephemeral: true });
        }
        
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Insufficient balance! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const gameId = Date.now().toString();
        client.activeGames = client.activeGames || new Map();
        client.activeGames.set(`rps_${interaction.user.id}`, { bet });
        
        const embed = new EmbedBuilder()
            .setTitle('✂️ ═══ ROCK PAPER SCISSORS ═══ 🪨')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\nChoose your weapon!\nWin = 2x, Tie = Money back`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`rps_rock_${gameId}`).setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`rps_paper_${gameId}`).setLabel('📄 Paper').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`rps_scissors_${gameId}`).setLabel('✂️ Scissors').setStyle(ButtonStyle.Danger)
        );
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
};
