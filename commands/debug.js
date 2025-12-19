const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Debug the bot and check for configuration issues')
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('What to debug')
                .setRequired(false)
                .addChoices(
                    { name: 'Full System Check', value: 'full' },
                    { name: 'Gem Parser', value: 'gems' },
                    { name: 'Shop System', value: 'shop' },
                    { name: 'Game Settings', value: 'games' },
                    { name: 'User Data', value: 'user' },
                    { name: 'Invite Logger', value: 'invites' }
                )),

    async execute(interaction) {
        const debugType = interaction.options.getString('type') || 'full';
        const user = db.getUser(interaction.user.id, interaction.user.username);

        const embed = new EmbedBuilder()
            .setTitle('🔍 DEBUG REPORT 🔍')
            .setColor(PS99_COLORS.info)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();

        try {
            if (debugType === 'full' || debugType === 'gems') {
                const tests = [
                    { input: '1000', expected: 1000 },
                    { input: '2.5m', expected: 2500000 },
                    { input: '1b', expected: 1000000000 },
                    { input: '500k', expected: 500000 },
                    { input: '1.5b', expected: 1500000000 }
                ];

                let gemResults = '✅ **Gem Parser Tests:**\n';
                let allPassed = true;
                tests.forEach(test => {
                    const result = parseGemAmount(test.input);
                    const passed = result === test.expected;
                    allPassed = allPassed && passed;
                    gemResults += `${passed ? '✅' : '❌'} \`${test.input}\` → \`${result.toLocaleString()}\` (expected \`${test.expected.toLocaleString()}\`)\n`;
                });
                embed.addFields({ name: 'Gem Parsing', value: gemResults, inline: false });
            }

            if (debugType === 'full' || debugType === 'shop') {
                const shopItems = db.getAllShopItems();
                let shopStatus = `✅ Shop Status:\n`;
                shopStatus += `📦 Total Items: \`${shopItems.length}\`\n`;
                
                let hasIssues = false;
                const itemsWithoutPrice = shopItems.filter(item => !item.price || item.price <= 0);
                const itemsDisabled = shopItems.filter(item => !item.enabled);

                if (itemsWithoutPrice.length > 0) {
                    shopStatus += `⚠️ Items without valid price: \`${itemsWithoutPrice.length}\`\n`;
                    hasIssues = true;
                }
                if (itemsDisabled.length > 0) {
                    shopStatus += `⚠️ Disabled items: \`${itemsDisabled.length}\`\n`;
                }

                shopStatus += hasIssues ? '❌ **Issues Found**' : '✅ **All Good**';
                embed.addFields({ name: 'Shop System', value: shopStatus, inline: false });
            }

            if (debugType === 'full' || debugType === 'games') {
                const gameNames = ['dice', 'coinflip', 'roulette', 'slots', 'dragontiger', 'keno', 'limbo', 'plinko', 'wheeloffortune', 'crash', 'mines', 'baccarat'];
                let gameStatus = '🎮 **Game Settings Status:**\n';
                let enabledCount = 0;
                let disabledCount = 0;

                gameNames.forEach(game => {
                    const settings = db.getGameSettings(game);
                    if (settings.enabled) {
                        enabledCount++;
                        gameStatus += `✅ ${game.toUpperCase()} - Min: \`${settings.minBet.toLocaleString()}\`, Max: \`${settings.maxBet.toLocaleString()}\`\n`;
                    } else {
                        disabledCount++;
                        gameStatus += `❌ ${game.toUpperCase()} - DISABLED\n`;
                    }
                });

                gameStatus += `\n📊 Total: \`${enabledCount}\` enabled, \`${disabledCount}\` disabled`;
                embed.addFields({ name: 'Game Settings', value: gameStatus, inline: false });
            }

            if (debugType === 'full' || debugType === 'user') {
                const userStatus = `👤 **Your User Data:**\n` +
                    `ID: \`${user.id}\`\n` +
                    `Balance: \`${user.balance.toLocaleString()}\` gems\n` +
                    `Joined: \`${new Date(user.createdAt).toLocaleDateString()}\`\n` +
                    `Games Played: \`${user.gamesPlayed}\`\n` +
                    `Wins: \`${user.wins}\`\n` +
                    `Losses: \`${user.losses}\`\n` +
                    `Total Wagered: \`${user.totalWagered.toLocaleString()}\` gems`;
                embed.addFields({ name: 'User Data', value: userStatus, inline: false });
            }

            if (debugType === 'full' || debugType === 'invites') {
                const inviteSettings = db.getInviteSettings();
                const userInvites = db.getInviteCount(interaction.user.id);
                
                const inviteStatus = `🎁 **Invite System:**\n` +
                    `Status: ${inviteSettings.enabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
                    `Reward Amount: \`${inviteSettings.amount.toLocaleString()}\` gems\n` +
                    `Min Account Age: \`${inviteSettings.minAccountAge || 60}\` days\n` +
                    `Your Invites: \`${userInvites}\`\n` +
                    `Log Channel: ${inviteSettings.channelId ? `<#${inviteSettings.channelId}>` : '❌ Not Set'}`;
                embed.addFields({ name: 'Invite System', value: inviteStatus, inline: false });
            }

            embed.setColor(PS99_COLORS.success);
            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Debug error:', error);
            await interaction.reply({ 
                embeds: [createErrorEmbed(`Debug Error: ${error.message}`)], 
                ephemeral: true 
            });
        }
    }
};
