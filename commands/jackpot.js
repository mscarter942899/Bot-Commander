const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jackpot')
        .setDescription('Try to hit the progressive jackpot!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (adds to jackpot pool)')
                .setRequired(true)
                .setMinValue(100)),
    
    async execute(interaction, client) {
        const bet = interaction.options.getInteger('bet');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('jackpot') || { enabled: true, minBet: 100, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Jackpot is disabled!')], ephemeral: true });
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
        
        let jackpotPool = db.getHouseProfit() * 0.1 + 100000;
        const contribution = Math.floor(bet * 0.1);
        db.addHouseProfit(contribution);
        
        const embed = new EmbedBuilder()
            .setTitle('💰 ═══ JACKPOT ═══ 💰')
            .setColor(PS99_COLORS.rainbow)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Current Jackpot:** \`${Math.floor(jackpotPool).toLocaleString()}\` gems\n\n🎰 Rolling for jackpot...`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 2000));
        
        const roll = Math.random() * 1000;
        let winAmount = 0;
        let resultText = '';
        
        if (roll < 0.1) {
            winAmount = Math.floor(jackpotPool);
            resultText = `🎊 **MEGA JACKPOT!!!** 🎊\n\nYou won the ENTIRE JACKPOT!\n**\`${winAmount.toLocaleString()}\` gems!**`;
        } else if (roll < 1) {
            winAmount = Math.floor(jackpotPool * 0.1);
            resultText = `🎉 **MINI JACKPOT!** 🎉\n\nYou won 10% of the jackpot!\n**\`${winAmount.toLocaleString()}\` gems!**`;
        } else if (roll < 10) {
            winAmount = bet * 10;
            resultText = `✨ **BIG WIN!** ✨\n\nYou won **\`${winAmount.toLocaleString()}\` gems!** (10x)`;
        } else if (roll < 50) {
            winAmount = bet * 3;
            resultText = `🎯 **Nice!** You won **\`${winAmount.toLocaleString()}\` gems!** (3x)`;
        } else if (roll < 150) {
            winAmount = bet;
            resultText = `💫 Money back! You got **\`${winAmount.toLocaleString()}\` gems!**`;
        } else {
            resultText = `😢 No jackpot this time. Lost **\`${bet.toLocaleString()}\` gems**\n\nYour bet added to the jackpot pool!`;
        }
        
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n**Jackpot Pool:** \`${Math.floor(jackpotPool).toLocaleString()}\` gems\n\n${resultText}`);
        embed.setColor(winAmount > 0 ? PS99_COLORS.success : PS99_COLORS.error);
        
        if (winAmount > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount - contribution);
            sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Jackpot', winAmount, winAmount / bet);
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet - contribution);
        }
        
        db.addLog({ type: 'jackpot', userId: interaction.user.id, username: interaction.user.username, bet, winAmount, won: winAmount > 0 });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
