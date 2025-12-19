const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Comprehensive bot diagnostics and error detection')
        .addStringOption(opt =>
            opt.setName('check')
                .setDescription('What to check')
                .setRequired(false)
                .addChoices(
                    { name: '🔍 Full System Scan', value: 'full' },
                    { name: '💎 Gem Parser Tests', value: 'gems' },
                    { name: '🛒 Shop Verification', value: 'shop' },
                    { name: '🎮 Game Settings', value: 'games' },
                    { name: '👤 User Data', value: 'user' },
                    { name: '🎁 Invite System', value: 'invites' },
                    { name: '📁 File Integrity', value: 'files' },
                    { name: '⚙️ Bot Config', value: 'config' }
                )),

    async execute(interaction) {
        const checkType = interaction.options.getString('check') || 'full';
        const user = db.getUser(interaction.user.id, interaction.user.username);

        try {
            await interaction.deferReply({ ephemeral: true });

            const results = [];
            const errors = [];

            if (checkType === 'full' || checkType === 'gems') {
                const tests = [
                    { input: '1000', expected: 1000, name: 'Plain number' },
                    { input: '2.5m', expected: 2500000, name: 'Millions' },
                    { input: '1b', expected: 1000000000, name: 'Billions' },
                    { input: '500k', expected: 500000, name: 'Thousands' },
                    { input: '1.5b', expected: 1500000000, name: 'Large billions' }
                ];

                let gemResults = '```\n';
                let allPassed = true;
                tests.forEach(test => {
                    const result = parseGemAmount(test.input);
                    const passed = result === test.expected;
                    allPassed = allPassed && passed;
                    const status = passed ? '✅' : '❌';
                    gemResults += `${status} ${test.name.padEnd(20)} ${test.input.padEnd(10)} → ${result.toLocaleString()}\n`;
                });
                gemResults += '```';
                results.push({ name: '💎 GEM PARSER', value: gemResults, status: allPassed ? '✅' : '❌' });
            }

            if (checkType === 'full' || checkType === 'shop') {
                try {
                    const shopItems = db.getAllShopItems();
                    let issues = [];
                    
                    if (!shopItems || shopItems.length === 0) {
                        issues.push('❌ No shop items found');
                    } else {
                        shopItems.forEach((item, idx) => {
                            if (!item.id) issues.push(`❌ Item ${idx}: Missing ID`);
                            if (!item.name) issues.push(`❌ Item ${idx}: Missing name`);
                            if (!item.price || item.price <= 0) issues.push(`❌ Item ${idx}: Invalid price (${item.price})`);
                            if (!item.enabled) issues.push(`⚠️ Item ${idx}: Disabled`);
                        });
                    }

                    const shopStatus = `\`\`\`\n📊 Total Items: ${shopItems.length}\n${issues.length === 0 ? '✅ All items valid' : issues.slice(0, 5).join('\n')}\n\`\`\``;
                    results.push({ name: '🛒 SHOP SYSTEM', value: shopStatus, status: issues.length === 0 ? '✅' : '⚠️' });
                } catch (e) {
                    errors.push(`Shop check failed: ${e.message}`);
                }
            }

            if (checkType === 'full' || checkType === 'games') {
                try {
                    const gameNames = ['dice', 'coinflip', 'roulette', 'slots', 'dragontiger', 'keno', 'limbo', 'plinko', 'wheeloffortune', 'crash', 'mines', 'baccarat', 'highlow', 'blackjack'];
                    let enabled = 0, disabled = 0;
                    let gameIssues = [];

                    gameNames.forEach(game => {
                        const settings = db.getGameSettings(game);
                        if (!settings) {
                            gameIssues.push(`❌ ${game}: Missing settings`);
                        } else if (!settings.enabled) {
                            disabled++;
                        } else {
                            enabled++;
                            if (!settings.minBet || !settings.maxBet) {
                                gameIssues.push(`⚠️ ${game}: Missing bet limits`);
                            }
                        }
                    });

                    const gameStatus = `\`\`\`\n✅ Enabled: ${enabled}\n❌ Disabled: ${disabled}\n${gameIssues.length > 0 ? gameIssues.slice(0, 3).join('\n') : '✅ All configured'}\n\`\`\``;
                    results.push({ name: '🎮 GAME SETTINGS', value: gameStatus, status: gameIssues.length === 0 ? '✅' : '⚠️' });
                } catch (e) {
                    errors.push(`Game check failed: ${e.message}`);
                }
            }

            if (checkType === 'full' || checkType === 'user') {
                const userStatus = `\`\`\`\nID: ${user.id}\nBalance: ${user.balance.toLocaleString()} gems\nGames: ${user.gamesPlayed}\nWins: ${user.wins} | Losses: ${user.losses}\nWR: ${user.gamesPlayed > 0 ? (user.wins/user.gamesPlayed*100).toFixed(1) : 0}%\n\`\`\``;
                results.push({ name: '👤 USER DATA', value: userStatus, status: user.balance > 0 ? '✅' : '⚠️' });
            }

            if (checkType === 'full' || checkType === 'invites') {
                try {
                    const inviteSettings = db.getInviteSettings();
                    const userInvites = db.getInviteCount(interaction.user.id);
                    let invIssues = [];

                    if (!inviteSettings.enabled) invIssues.push('⚠️ System disabled');
                    if (!inviteSettings.channelId) invIssues.push('⚠️ No log channel set');
                    if (!inviteSettings.amount || inviteSettings.amount <= 0) invIssues.push('❌ Invalid reward amount');

                    const invStatus = `\`\`\`\nStatus: ${inviteSettings.enabled ? '✅ Active' : '❌ Disabled'}\nReward: ${inviteSettings.amount.toLocaleString()} gems\nYour Invites: ${userInvites}\nLog Channel: ${inviteSettings.channelId ? '✅ Set' : '❌ Not set'}\n${invIssues.length > 0 ? invIssues.join('\n') : '✅ All good'}\n\`\`\``;
                    results.push({ name: '🎁 INVITE SYSTEM', value: invStatus, status: invIssues.length === 0 ? '✅' : '⚠️' });
                } catch (e) {
                    errors.push(`Invite check failed: ${e.message}`);
                }
            }

            if (checkType === 'full' || checkType === 'files') {
                try {
                    const commandsPath = path.join(__dirname, '../commands');
                    const buttonsPath = path.join(__dirname, '../buttons');
                    const filesIssues = [];

                    if (fs.existsSync(commandsPath)) {
                        const cmdCount = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).length;
                        if (cmdCount < 60) filesIssues.push(`⚠️ Commands: ${cmdCount} found (expected 60+)`);
                    } else filesIssues.push('❌ Commands directory missing');

                    if (fs.existsSync(buttonsPath)) {
                        const btnCount = fs.readdirSync(buttonsPath).filter(f => f.endsWith('.js')).length;
                        if (btnCount < 10) filesIssues.push(`⚠️ Buttons: ${btnCount} found`);
                    } else filesIssues.push('❌ Buttons directory missing');

                    const fileStatus = `\`\`\`\n${filesIssues.length === 0 ? '✅ All files present' : filesIssues.join('\n')}\n\`\`\``;
                    results.push({ name: '📁 FILE INTEGRITY', value: fileStatus, status: filesIssues.length === 0 ? '✅' : '⚠️' });
                } catch (e) {
                    errors.push(`File check failed: ${e.message}`);
                }
            }

            if (checkType === 'full' || checkType === 'config') {
                try {
                    const hasToken = !!process.env.DISCORD_TOKEN;
                    const configIssues = [];

                    if (!hasToken) configIssues.push('❌ DISCORD_TOKEN not set');
                    if (!process.env.NODE_ENV) configIssues.push('⚠️ NODE_ENV not set');

                    const configStatus = `\`\`\`\nToken: ${hasToken ? '✅ Set' : '❌ Missing'}\nEnvironment: ${process.env.NODE_ENV || 'Not set'}\n${configIssues.length === 0 ? '✅ Configured' : configIssues.join('\n')}\n\`\`\``;
                    results.push({ name: '⚙️ BOT CONFIG', value: configStatus, status: hasToken ? '✅' : '❌' });
                } catch (e) {
                    errors.push(`Config check failed: ${e.message}`);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔍 SYSTEM DIAGNOSTIC REPORT')
                .setColor(PS99_COLORS.info)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            results.forEach(r => {
                embed.addFields({ name: `${r.status} ${r.name}`, value: r.value, inline: false });
            });

            if (errors.length > 0) {
                embed.addFields({ name: '⚠️ ERRORS DETECTED', value: `\`\`\`\n${errors.join('\n')}\n\`\`\``, inline: false });
                embed.setColor(PS99_COLORS.error);
            } else {
                embed.setColor(PS99_COLORS.success);
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Debug command error:', error);
            await interaction.editReply({ 
                embeds: [createErrorEmbed(`Debug Error: ${error.message}`)]
            });
        }
    }
};
