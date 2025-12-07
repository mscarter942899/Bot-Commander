const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createPS99Embed, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup(group =>
            group.setName('games')
                .setDescription('Game settings')
                .addSubcommand(sub =>
                    sub.setName('setbet')
                        .setDescription('Set min/max bet for a game')
                        .addStringOption(opt =>
                            opt.setName('game')
                                .setDescription('Game to configure')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Slots', value: 'slots' },
                                    { name: 'Blackjack', value: 'blackjack' },
                                    { name: 'Poker', value: 'poker' },
                                    { name: 'High/Low', value: 'highlow' },
                                    { name: 'War', value: 'war' },
                                    { name: 'Roulette', value: 'roulette' },
                                    { name: 'Baccarat', value: 'baccarat' },
                                    { name: 'Crash', value: 'crash' },
                                    { name: 'Dice', value: 'dice' },
                                    { name: 'Mines', value: 'mines' },
                                    { name: 'Coinflip', value: 'coinflip' }
                                ))
                        .addIntegerOption(opt => opt.setName('min').setDescription('Minimum bet').setMinValue(1))
                        .addIntegerOption(opt => opt.setName('max').setDescription('Maximum bet').setMinValue(1)))
                .addSubcommand(sub =>
                    sub.setName('toggle')
                        .setDescription('Enable or disable a game')
                        .addStringOption(opt =>
                            opt.setName('game')
                                .setDescription('Game to toggle')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Slots', value: 'slots' },
                                    { name: 'Blackjack', value: 'blackjack' },
                                    { name: 'Poker', value: 'poker' },
                                    { name: 'High/Low', value: 'highlow' },
                                    { name: 'War', value: 'war' },
                                    { name: 'Roulette', value: 'roulette' },
                                    { name: 'Baccarat', value: 'baccarat' },
                                    { name: 'Crash', value: 'crash' },
                                    { name: 'Dice', value: 'dice' },
                                    { name: 'Mines', value: 'mines' },
                                    { name: 'Coinflip', value: 'coinflip' }
                                ))
                        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable or disable').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('settings')
                        .setDescription('View all game settings')))
        .addSubcommandGroup(group =>
            group.setName('economy')
                .setDescription('Economy commands')
                .addSubcommand(sub =>
                    sub.setName('reset')
                        .setDescription('Reset a user\'s balance')
                        .addUserOption(opt => opt.setName('user').setDescription('User to reset').setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('set')
                        .setDescription('Set a user\'s balance')
                        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setRequired(true).setMinValue(0)))
                .addSubcommand(sub =>
                    sub.setName('stats')
                        .setDescription('View economy statistics')))
        .addSubcommandGroup(group =>
            group.setName('inventory')
                .setDescription('Inventory commands')
                .addSubcommand(sub =>
                    sub.setName('grant')
                        .setDescription('Grant an item to a user')
                        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
                        .addStringOption(opt => opt.setName('item').setDescription('Item name').setRequired(true))
                        .addStringOption(opt => opt.setName('description').setDescription('Item description'))
                        .addStringOption(opt => opt.setName('image').setDescription('Image URL')))
                .addSubcommand(sub =>
                    sub.setName('clear')
                        .setDescription('Clear a user\'s inventory')
                        .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('fun')
                .setDescription('Fun admin commands')
                .addSubcommand(sub =>
                    sub.setName('makeitrain')
                        .setDescription('Give gems to everyone who reacts!')
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Amount per person').setRequired(true).setMinValue(1))
                        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in seconds').setMinValue(10).setMaxValue(300)))
                .addSubcommand(sub =>
                    sub.setName('rigged')
                        .setDescription('Rigged coinflip (for fun)')
                        .addUserOption(opt => opt.setName('user').setDescription('User to challenge').setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('result')
                                .setDescription('What they will get')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Win', value: 'win' },
                                    { name: 'Lose', value: 'lose' }
                                )))
                .addSubcommand(sub =>
                    sub.setName('jackpot')
                        .setDescription('Give a random online user a jackpot!')
                        .addIntegerOption(opt => opt.setName('amount').setDescription('Jackpot amount').setRequired(true).setMinValue(100)))),
    
    async execute(interaction, client) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        
        if (group === 'games') {
            if (subcommand === 'setbet') {
                const game = interaction.options.getString('game');
                const min = interaction.options.getInteger('min');
                const max = interaction.options.getInteger('max');
                
                const updates = {};
                if (min !== null) updates.minBet = min;
                if (max !== null) updates.maxBet = max;
                
                if (Object.keys(updates).length === 0) {
                    return interaction.reply({ embeds: [createErrorEmbed('Please specify min or max bet!')], ephemeral: true });
                }
                
                const settings = db.updateGameSettings(game, updates);
                
                db.addLog({
                    type: 'game_settings',
                    userId: interaction.user.id,
                    game: game,
                    changes: updates
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Game Settings Updated', `**${game}** settings updated!\nMin: \`${settings.minBet.toLocaleString()}\` | Max: \`${settings.maxBet.toLocaleString()}\``)]
                });
                
            } else if (subcommand === 'toggle') {
                const game = interaction.options.getString('game');
                const enabled = interaction.options.getBoolean('enabled');
                
                db.updateGameSettings(game, { enabled });
                
                db.addLog({
                    type: 'game_toggle',
                    userId: interaction.user.id,
                    game: game,
                    enabled: enabled
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Game Toggled', `**${game}** is now ${enabled ? '✅ enabled' : '❌ disabled'}!`)]
                });
                
            } else if (subcommand === 'settings') {
                const allSettings = db.getAllGameSettings();
                
                let description = '';
                for (const [game, settings] of Object.entries(allSettings)) {
                    const status = settings.enabled ? '✅' : '❌';
                    description += `${status} **${game}**: Min \`${settings.minBet.toLocaleString()}\` | Max \`${settings.maxBet.toLocaleString()}\`\n`;
                }
                
                await interaction.reply({
                    embeds: [createPS99Embed({
                        title: '⚙️ Game Settings',
                        description: description,
                        color: PS99_COLORS.info
                    })],
                    ephemeral: true
                });
            }
            
        } else if (group === 'economy') {
            if (subcommand === 'reset') {
                const user = interaction.options.getUser('user');
                
                db.resetUserBalance(user.id);
                
                db.addLog({
                    type: 'balance_reset',
                    userId: interaction.user.id,
                    targetId: user.id,
                    targetUsername: user.username
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Balance Reset', `${user}'s balance has been reset to 500 gems.`)]
                });
                
            } else if (subcommand === 'set') {
                const user = interaction.options.getUser('user');
                const amount = interaction.options.getInteger('amount');
                
                db.setUserBalance(user.id, amount);
                
                db.addLog({
                    type: 'balance_set',
                    userId: interaction.user.id,
                    targetId: user.id,
                    amount: amount
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Balance Set', `${user}'s balance has been set to \`${amount.toLocaleString()}\` gems.`)]
                });
                
            } else if (subcommand === 'stats') {
                const allUsers = db.getAllUsers();
                const totalBalance = allUsers.reduce((sum, u) => sum + u.balance + u.bank, 0);
                const totalWagered = allUsers.reduce((sum, u) => sum + u.totalWagered, 0);
                const totalWon = allUsers.reduce((sum, u) => sum + u.totalWon, 0);
                const houseProfit = db.getHouseProfit();
                
                await interaction.reply({
                    embeds: [createPS99Embed({
                        title: '📊 Economy Statistics',
                        fields: [
                            { name: '👥 Total Users', value: allUsers.length.toString(), inline: true },
                            { name: '💰 Total Circulation', value: `\`${totalBalance.toLocaleString()}\` gems`, inline: true },
                            { name: '🏦 House Profit', value: `\`${houseProfit.toLocaleString()}\` gems`, inline: true },
                            { name: '🎰 Total Wagered', value: `\`${totalWagered.toLocaleString()}\` gems`, inline: true },
                            { name: '🏆 Total Won', value: `\`${totalWon.toLocaleString()}\` gems`, inline: true }
                        ],
                        color: PS99_COLORS.gold
                    })],
                    ephemeral: true
                });
            }
            
        } else if (group === 'inventory') {
            if (subcommand === 'grant') {
                const user = interaction.options.getUser('user');
                const itemName = interaction.options.getString('item');
                const description = interaction.options.getString('description') || '';
                const image = interaction.options.getString('image') || null;
                
                db.grantItem(user.id, {
                    name: itemName,
                    description: description,
                    image: image
                });
                
                db.addLog({
                    type: 'item_grant',
                    userId: interaction.user.id,
                    targetId: user.id,
                    item: itemName
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Item Granted', `Granted **${itemName}** to ${user}!`)]
                });
                
            } else if (subcommand === 'clear') {
                const user = interaction.options.getUser('user');
                const userData = db.getUser(user.id);
                const itemCount = userData.inventory ? userData.inventory.length : 0;
                
                if (userData.inventory) {
                    userData.inventory = [];
                    db.updateUser(user.id, { inventory: [] });
                }
                
                db.addLog({
                    type: 'inventory_clear',
                    userId: interaction.user.id,
                    targetId: user.id,
                    itemsCleared: itemCount
                });
                
                await interaction.reply({
                    embeds: [createSuccessEmbed('Inventory Cleared', `Cleared ${itemCount} items from ${user}'s inventory.`)]
                });
            }
            
        } else if (group === 'fun') {
            if (subcommand === 'makeitrain') {
                const amount = interaction.options.getInteger('amount');
                const duration = interaction.options.getInteger('duration') || 30;
                
                const embed = new EmbedBuilder()
                    .setTitle('💰🌧️ MAKE IT RAIN! 🌧️💰')
                    .setColor(PS99_COLORS.gold)
                    .setDescription(`React with 💰 within ${duration} seconds to receive **${amount.toLocaleString()} gems**!`)
                    .setFooter({ text: `Hosted by ${interaction.user.username}` })
                    .setTimestamp();
                
                const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
                await msg.react('💰');
                
                const filter = (reaction, user) => reaction.emoji.name === '💰' && !user.bot;
                const collector = msg.createReactionCollector({ filter, time: duration * 1000 });
                
                const winners = new Set();
                
                collector.on('collect', (reaction, user) => {
                    if (!winners.has(user.id)) {
                        winners.add(user.id);
                        db.addBalance(user.id, amount);
                    }
                });
                
                collector.on('end', async () => {
                    const resultEmbed = new EmbedBuilder()
                        .setTitle('💰🌧️ RAIN ENDED 🌧️💰')
                        .setColor(PS99_COLORS.success)
                        .setDescription(`**${winners.size}** users received **${amount.toLocaleString()} gems** each!\n\nTotal distributed: \`${(winners.size * amount).toLocaleString()}\` gems`)
                        .setFooter({ text: `Hosted by ${interaction.user.username}` })
                        .setTimestamp();
                    
                    await msg.edit({ embeds: [resultEmbed] });
                });
                
            } else if (subcommand === 'rigged') {
                const user = interaction.options.getUser('user');
                const result = interaction.options.getString('result');
                
                await interaction.reply({
                    embeds: [createPS99Embed({
                        title: '🪙 Rigged Coinflip',
                        description: `${user}, you've been challenged to a coinflip!\n\n*This coinflip is totally fair and not rigged at all...*\n\n**Result:** ${result === 'win' ? '🎉 You win!' : '😢 You lose!'}`,
                        color: result === 'win' ? PS99_COLORS.success : PS99_COLORS.error
                    })]
                });
                
            } else if (subcommand === 'jackpot') {
                const amount = interaction.options.getInteger('amount');
                const allUsers = db.getAllUsers();
                
                if (allUsers.length === 0) {
                    return interaction.reply({ embeds: [createErrorEmbed('No users to give jackpot to!')], ephemeral: true });
                }
                
                const winner = allUsers[Math.floor(Math.random() * allUsers.length)];
                db.addBalance(winner.id, amount);
                
                db.addLog({
                    type: 'jackpot',
                    userId: interaction.user.id,
                    winnerId: winner.id,
                    amount: amount
                });
                
                await interaction.reply({
                    embeds: [createPS99Embed({
                        title: '🎰💰 JACKPOT! 💰🎰',
                        description: `**${winner.username}** has won the random jackpot of **${amount.toLocaleString()} gems**!`,
                        color: PS99_COLORS.gold
                    })]
                });
            }
        }
    }
};
