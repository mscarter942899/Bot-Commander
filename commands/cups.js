const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cups')
        .setDescription('Find the ball under the cup!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addIntegerOption(option =>
            option.setName('cups')
                .setDescription('Number of cups (3-5)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(5)),
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const numCups = interaction.options.getInteger('cups') || 3;
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('cups') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Cups game is disabled!')], ephemeral: true });
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
        
        const ballPosition = Math.floor(Math.random() * numCups);
        const multipliers = { 3: 2.5, 4: 3.5, 5: 4.5 };
        const multiplier = multipliers[numCups];
        
        const gameId = Date.now().toString();
        client.activeGames = client.activeGames || new Map();
        client.activeGames.set(`cups_${interaction.user.id}`, { bet, ballPosition, numCups, multiplier });
        
        const cupsDisplay = '🥤'.repeat(numCups);
        
        const embed = new EmbedBuilder()
            .setTitle('🎪 ═══ CUPS GAME ═══ 🎪')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Cups:** ${numCups} (${multiplier}x payout)\n\n${cupsDisplay}\n\n🎱 The ball is hidden under one cup!\n**Pick a cup to reveal!**`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        const buttons = new ActionRowBuilder().addComponents(
            ...Array(numCups).fill(0).map((_, i) => 
                new ButtonBuilder()
                    .setCustomId(`cups_pick_${i}_${gameId}`)
                    .setLabel(`Cup ${i + 1}`)
                    .setEmoji('🥤')
                    .setStyle(ButtonStyle.Primary)
            )
        );
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
};
