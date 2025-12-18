const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('russianroulette')
        .setDescription('Risk it all - survive for bigger multipliers!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('russianroulette') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Russian Roulette is disabled!')], ephemeral: true });
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
        
        const gameId = Date.now().toString();
        const bulletPosition = Math.floor(Math.random() * 6);
        
        client.activeGames = client.activeGames || new Map();
        client.activeGames.set(`rr_${interaction.user.id}`, { 
            bet, 
            bulletPosition, 
            currentChamber: 0,
            survived: 0
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🔫 ═══ RUSSIAN ROULETTE ═══ 🔫')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n🔫 **6 chambers, 1 bullet**\n\nSurvive each pull for higher multipliers!\n\n**Current Multiplier:** \`1.5x\`\n**Survived:** 0/5`)
            .addFields(
                { name: '💰 Payout Table', value: '1 pull: 1.5x\n2 pulls: 2x\n3 pulls: 3x\n4 pulls: 5x\n5 pulls: 10x', inline: true }
            )
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`rr_pull_${gameId}`)
                .setLabel('🔫 Pull Trigger')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`rr_cashout_${gameId}`)
                .setLabel('💰 Cash Out')
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
};
