const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('numberguess')
        .setDescription('Guess a number 1-100 for multiplied winnings!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
        .addIntegerOption(option =>
            option.setName('guess')
                .setDescription('Your guess (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const guess = interaction.options.getInteger('guess');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('numberguess') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Number Guess is disabled!')], ephemeral: true });
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
        
        const embed = new EmbedBuilder()
            .setTitle('🔢 ═══ NUMBER GUESS ═══ 🔢')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Your Guess:** \`${guess}\`\n\n🎲 Rolling...`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 1500));
        
        const result = Math.floor(Math.random() * 100) + 1;
        const diff = Math.abs(result - guess);
        
        let multiplier = 0;
        let message = '';
        
        if (diff === 0) {
            multiplier = 50;
            message = '🎯 **PERFECT MATCH!** JACKPOT!';
        } else if (diff <= 2) {
            multiplier = 10;
            message = '🔥 **SO CLOSE!** Amazing guess!';
        } else if (diff <= 5) {
            multiplier = 5;
            message = '✨ **Great guess!**';
        } else if (diff <= 10) {
            multiplier = 2;
            message = '👍 **Good guess!**';
        } else if (diff <= 20) {
            multiplier = 1;
            message = '😊 **Not bad!** Money back!';
        } else {
            message = '😢 **Too far off!**';
        }
        
        const winAmount = bet * multiplier;
        
        const resultEmbed = new EmbedBuilder()
            .setTitle('🔢 ═══ NUMBER GUESS ═══ 🔢')
            .setColor(multiplier > 0 ? PS99_COLORS.success : PS99_COLORS.error)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Your Guess:** \`${guess}\`\n**Actual Number:** \`${result}\`\n**Difference:** \`${diff}\`\n\n${message}\n\n${multiplier > 0 ? `Won: \`${winAmount.toLocaleString()}\` gems (${multiplier}x)` : `Lost: \`${bet.toLocaleString()}\` gems`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        if (multiplier > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            if (multiplier >= 10) {
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Number Guess', winAmount, multiplier);
            }
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'numberguess',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet, guess, result, diff, multiplier, won: multiplier > 0
        });
        
        await interaction.editReply({ embeds: [resultEmbed] });
    }
};
