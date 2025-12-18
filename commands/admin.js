const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, ICONS, createErrorEmbed, createPremiumEmbed, createSuccessEmbed, createColorGuessEmbed, createNumberGuessEmbed, createTriviaEmbed, createHotPotatoEmbed, createMysteryBoxEmbed } = require('../utils/embedBuilder');

const TRIVIA_QUESTIONS = [
    { category: 'Gaming', question: 'What year was Minecraft officially released?', options: ['2009', '2011', '2013', '2015'], answer: 1 },
    { category: 'Gaming', question: 'What is the best-selling video game of all time?', options: ['Tetris', 'Minecraft', 'GTA V', 'Wii Sports'], answer: 1 },
    { category: 'Gaming', question: 'Which company created the PlayStation?', options: ['Microsoft', 'Nintendo', 'Sony', 'Sega'], answer: 2 },
    { category: 'Science', question: 'What planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
    { category: 'Science', question: 'What is the chemical symbol for Gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2 },
    { category: 'Math', question: 'What is 15% of 200?', options: ['15', '20', '30', '35'], answer: 2 },
    { category: 'Math', question: 'What is the square root of 144?', options: ['10', '11', '12', '14'], answer: 2 },
    { category: 'General', question: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2 },
    { category: 'General', question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2 },
    { category: 'Gaming', question: 'What game features a character named Master Chief?', options: ['Call of Duty', 'Halo', 'Destiny', 'Gears of War'], answer: 1 },
    { category: 'General', question: 'What year did the Titanic sink?', options: ['1910', '1912', '1914', '1916'], answer: 1 },
    { category: 'Science', question: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Platinum'], answer: 2 }
];

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const COLOR_EMOJIS = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', purple: '🟣', orange: '🟠' };

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
                .addSubcommand(sub =>
                    sub.setName('guesscolor')
                        .setDescription('Start a color guessing game!')
                        .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount in gems').setRequired(true).setMinValue(100))
                        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in seconds (10-120)').setMinValue(10).setMaxValue(120)))
                .addSubcommand(sub =>
                    sub.setName('guessnumber')
                        .setDescription('Start a number guessing game!')
                        .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount in gems').setRequired(true).setMinValue(100))
                        .addIntegerOption(opt => opt.setName('max').setDescription('Maximum number (10-1000)').setMinValue(10).setMaxValue(1000))
                        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in seconds (30-180)').setMinValue(30).setMaxValue(180)))
                .addSubcommand(sub =>
                    sub.setName('trivia')
                        .setDescription('Start a trivia game!')
                        .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount in gems').setRequired(true).setMinValue(100))
                        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in seconds (10-60)').setMinValue(10).setMaxValue(60)))
                .addSubcommand(sub =>
                    sub.setName('hotpotato')
                        .setDescription('Start a hot potato game!')
                        .addIntegerOption(opt => opt.setName('prize').setDescription('Prize pool in gems').setRequired(true).setMinValue(500))
                        .addIntegerOption(opt => opt.setName('players').setDescription('Minimum players (2-20)').setMinValue(2).setMaxValue(20)))
                .addSubcommand(sub =>
                    sub.setName('mysterybox')
                        .setDescription('Drop a mystery box!')
                        .addStringOption(opt =>
                            opt.setName('tier')
                                .setDescription('Box tier')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Common', value: 'common' },
                                    { name: 'Rare', value: 'rare' },
                                    { name: 'Epic', value: 'epic' },
                                    { name: 'Legendary', value: 'legendary' }
                                )))),
    
    async execute(interaction, client) {
        if (!db.canUseAdminCommands(interaction.member)) {
            return interaction.reply({ embeds: [createErrorEmbed('You do not have permission to use admin commands!')], ephemeral: true });
        }

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
                
                let description = '```ansi\n[1;33m╭────────────────────────────────╮[0m\n[1;33m│[0m      [1;37mGAME CONFIGURATION[0m      [1;33m│[0m\n[1;33m╰────────────────────────────────╯[0m```\n';
                for (const [game, settings] of Object.entries(allSettings)) {
                    const status = settings.enabled ? '✅' : '❌';
                    description += `${status} **${game.charAt(0).toUpperCase() + game.slice(1)}**\n└ Min: \`${settings.minBet.toLocaleString()}\` | Max: \`${settings.maxBet.toLocaleString()}\`\n`;
                }
                
                await interaction.reply({
                    embeds: [createPremiumEmbed({
                        title: 'Game Settings',
                        titleIcon: '⚙️',
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
                    embeds: [createPremiumEmbed({
                        title: 'Economy Statistics',
                        titleIcon: '📊',
                        description: '```ansi\n[1;35m╭────────────────────────────────╮[0m\n[1;35m│[0m       [1;33mSERVER ECONOMY[0m       [1;35m│[0m\n[1;35m╰────────────────────────────────╯[0m```',
                        fields: [
                            { icon: '👥', name: 'Total Users', value: `\`${allUsers.length}\``, inline: true },
                            { icon: '💰', name: 'Circulation', value: `\`${totalBalance.toLocaleString()}\``, inline: true },
                            { icon: '🏦', name: 'House Profit', value: `\`${houseProfit.toLocaleString()}\``, inline: true },
                            { icon: '🎰', name: 'Total Wagered', value: `\`${totalWagered.toLocaleString()}\``, inline: true },
                            { icon: '🏆', name: 'Total Won', value: `\`${totalWon.toLocaleString()}\``, inline: true }
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
                
                const embed = createPremiumEmbed({
                    title: 'MAKE IT RAIN!',
                    titleIcon: '🌧️',
                    color: PS99_COLORS.gold,
                    description: `\`\`\`ansi\n[1;33m╭─────────────────────────────╮[0m\n[1;33m│[0m    [1;32m💰 FREE GEMS! 💰[0m    [1;33m│[0m\n[1;33m╰─────────────────────────────╯[0m\`\`\`\n\nReact with 💰 within **${duration} seconds** to receive **${amount.toLocaleString()} gems**!`,
                    footer: `Hosted by ${interaction.user.username}`
                });
                
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
                    const resultEmbed = createPremiumEmbed({
                        title: 'RAIN ENDED',
                        titleIcon: '🌈',
                        color: PS99_COLORS.success,
                        description: `\`\`\`diff\n+ Rain Complete! +\`\`\`\n\n**${winners.size}** users received **${amount.toLocaleString()} gems** each!\n\n💰 **Total distributed:** \`${(winners.size * amount).toLocaleString()}\` gems`,
                        footer: `Hosted by ${interaction.user.username}`
                    });
                    
                    await msg.edit({ embeds: [resultEmbed] });
                });
                
            } else if (subcommand === 'rigged') {
                const user = interaction.options.getUser('user');
                const result = interaction.options.getString('result');
                
                await interaction.reply({
                    embeds: [createPremiumEmbed({
                        title: 'Rigged Coinflip',
                        titleIcon: '🪙',
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
                    embeds: [createPremiumEmbed({
                        title: 'JACKPOT!',
                        titleIcon: '🎰',
                        description: `\`\`\`ansi\n[1;33m╭─────────────────────────────╮[0m\n[1;33m│[0m    [1;31m🎰 JACKPOT WINNER! 🎰[0m    [1;33m│[0m\n[1;33m╰─────────────────────────────╯[0m\`\`\`\n\n👑 **${winner.username}** has won the random jackpot!\n\n💰 **Prize:** \`${amount.toLocaleString()}\` gems`,
                        color: PS99_COLORS.legendary
                    })]
                });
                
            } else if (subcommand === 'guesscolor') {
                const prize = interaction.options.getInteger('prize');
                const duration = interaction.options.getInteger('duration') || 30;
                
                const secretColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('color_red').setEmoji('🔴').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('color_blue').setEmoji('🔵').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('color_green').setEmoji('🟢').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('color_yellow').setEmoji('🟡').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('color_purple').setEmoji('🟣').setStyle(ButtonStyle.Secondary)
                );
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('color_orange').setEmoji('🟠').setStyle(ButtonStyle.Secondary)
                );
                
                const embed = createPremiumEmbed({
                    title: 'Guess The Color!',
                    titleIcon: '🎨',
                    color: PS99_COLORS.rainbow,
                    description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35m│[0m    [1;33mCOLOR GUESSING GAME[0m    [1;35m│[0m\n[1;35m╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${duration}s\`\n\n**Click a color button to guess!**`,
                    footer: `Hosted by ${interaction.user.username}`
                });
                
                const msg = await interaction.reply({ embeds: [embed], components: [row, row2], fetchReply: true });
                
                let winner = null;
                const guessed = new Set();
                
                const collector = msg.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: duration * 1000 
                });
                
                collector.on('collect', async (i) => {
                    if (guessed.has(i.user.id)) {
                        return i.reply({ content: 'You already guessed!', ephemeral: true });
                    }
                    guessed.add(i.user.id);
                    
                    const guessedColor = i.customId.replace('color_', '');
                    
                    if (guessedColor === secretColor && !winner) {
                        winner = i.user;
                        db.addBalance(i.user.id, prize);
                        collector.stop('won');
                        await i.reply({ content: `🎉 **CORRECT!** You guessed ${COLOR_EMOJIS[secretColor]} and won **${prize.toLocaleString()} gems**!`, ephemeral: false });
                    } else {
                        await i.reply({ content: `❌ Wrong! ${COLOR_EMOJIS[guessedColor]} is not the secret color.`, ephemeral: true });
                    }
                });
                
                collector.on('end', async (collected, reason) => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('color_red').setEmoji('🔴').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('color_blue').setEmoji('🔵').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('color_green').setEmoji('🟢').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('color_yellow').setEmoji('🟡').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('color_purple').setEmoji('🟣').setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );
                    const disabledRow2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('color_orange').setEmoji('🟠').setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );
                    
                    const resultEmbed = createPremiumEmbed({
                        title: 'Color Game Ended!',
                        titleIcon: '🎨',
                        color: winner ? PS99_COLORS.success : PS99_COLORS.error,
                        description: winner 
                            ? `\`\`\`diff\n+ Winner Found! +\`\`\`\n\n👑 **${winner.username}** guessed correctly!\n\nThe secret color was ${COLOR_EMOJIS[secretColor]} **${secretColor}**\n\n💰 **Prize:** \`${prize.toLocaleString()}\` gems`
                            : `\`\`\`diff\n- No Winner -\`\`\`\n\nNobody guessed the secret color!\n\nIt was ${COLOR_EMOJIS[secretColor]} **${secretColor}**`,
                        footer: `Hosted by ${interaction.user.username}`
                    });
                    
                    await msg.edit({ embeds: [resultEmbed], components: [disabledRow, disabledRow2] });
                });
                
            } else if (subcommand === 'guessnumber') {
                const prize = interaction.options.getInteger('prize');
                const maxNumber = interaction.options.getInteger('max') || 100;
                const duration = interaction.options.getInteger('duration') || 60;
                
                const secretNumber = Math.floor(Math.random() * maxNumber) + 1;
                
                const embed = createPremiumEmbed({
                    title: 'Guess The Number!',
                    titleIcon: '🔮',
                    color: PS99_COLORS.cosmic,
                    description: `\`\`\`ansi\n[1;36m╭─────────────────────────────╮[0m\n[1;36m│[0m    [1;33mNUMBER GUESSING GAME[0m    [1;36m│[0m\n[1;36m╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${duration}s\`\n🔢 **Range:** \`1 - ${maxNumber}\`\n\n**Type a number in chat to guess!**`,
                    footer: `Hosted by ${interaction.user.username} | First exact guess wins!`
                });
                
                await interaction.reply({ embeds: [embed] });
                
                const guesses = new Map();
                let winner = null;
                
                const filter = (m) => {
                    const num = parseInt(m.content);
                    return !isNaN(num) && num >= 1 && num <= maxNumber && !m.author.bot;
                };
                
                const collector = interaction.channel.createMessageCollector({ filter, time: duration * 1000 });
                
                collector.on('collect', async (m) => {
                    const guess = parseInt(m.content);
                    
                    if (!guesses.has(m.author.id)) {
                        guesses.set(m.author.id, { user: m.author, guess, diff: Math.abs(guess - secretNumber) });
                    }
                    
                    if (guess === secretNumber && !winner) {
                        winner = m.author;
                        db.addBalance(m.author.id, prize);
                        collector.stop('won');
                        await m.reply(`🎉 **CORRECT!** The number was **${secretNumber}**! You won **${prize.toLocaleString()} gems**!`);
                    } else if (guess < secretNumber) {
                        await m.react('⬆️');
                    } else {
                        await m.react('⬇️');
                    }
                });
                
                collector.on('end', async (collected, reason) => {
                    if (winner) return;
                    
                    let closestUser = null;
                    let closestDiff = Infinity;
                    
                    guesses.forEach((data, id) => {
                        if (data.diff < closestDiff) {
                            closestDiff = data.diff;
                            closestUser = data;
                        }
                    });
                    
                    const resultEmbed = createPremiumEmbed({
                        title: 'Number Game Ended!',
                        titleIcon: '🔮',
                        color: closestUser ? PS99_COLORS.gold : PS99_COLORS.error,
                        description: closestUser 
                            ? `\`\`\`diff\n+ Closest Guess Wins! +\`\`\`\n\nThe number was **${secretNumber}**!\n\n👑 **${closestUser.user.username}** was closest with **${closestUser.guess}**! (off by ${closestDiff})\n\n💰 **Prize:** \`${Math.floor(prize / 2).toLocaleString()}\` gems (half prize)`
                            : `\`\`\`diff\n- No Guesses -\`\`\`\n\nNobody tried to guess!\n\nThe number was **${secretNumber}**`,
                        footer: `Hosted by ${interaction.user.username}`
                    });
                    
                    if (closestUser) {
                        db.addBalance(closestUser.user.id, Math.floor(prize / 2));
                    }
                    
                    await interaction.followUp({ embeds: [resultEmbed] });
                });
                
            } else if (subcommand === 'trivia') {
                const prize = interaction.options.getInteger('prize');
                const duration = interaction.options.getInteger('duration') || 30;
                
                const question = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
                const optionLetters = ['🅰️', '🅱️', '🅲', '🅳'];
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('trivia_0').setLabel('A').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('trivia_1').setLabel('B').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('trivia_2').setLabel('C').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('trivia_3').setLabel('D').setStyle(ButtonStyle.Primary)
                );
                
                let optionsText = question.options.map((opt, i) => `${optionLetters[i]} ${opt}`).join('\n');
                
                const embed = createPremiumEmbed({
                    title: 'Trivia Time!',
                    titleIcon: '🧠',
                    color: PS99_COLORS.sapphire,
                    description: `\`\`\`ansi\n[1;34m╭─────────────────────────────╮[0m\n[1;34m│[0m       [1;33m${question.category.toUpperCase()}[0m       [1;34m│[0m\n[1;34m╰─────────────────────────────╯[0m\`\`\`\n\n**${question.question}**\n\n${optionsText}\n\n${ICONS.gem} **Prize:** \`${prize.toLocaleString()}\` gems\n${ICONS.clock} **Time Left:** \`${duration}s\``,
                    footer: `Hosted by ${interaction.user.username}`
                });
                
                const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
                
                let winner = null;
                const answered = new Set();
                
                const collector = msg.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: duration * 1000 
                });
                
                collector.on('collect', async (i) => {
                    if (answered.has(i.user.id)) {
                        return i.reply({ content: 'You already answered!', ephemeral: true });
                    }
                    answered.add(i.user.id);
                    
                    const answerIndex = parseInt(i.customId.replace('trivia_', ''));
                    
                    if (answerIndex === question.answer && !winner) {
                        winner = i.user;
                        db.addBalance(i.user.id, prize);
                        collector.stop('won');
                        await i.reply({ content: `🎉 **CORRECT!** The answer was **${question.options[question.answer]}**! You won **${prize.toLocaleString()} gems**!`, ephemeral: false });
                    } else {
                        await i.reply({ content: `❌ Wrong answer!`, ephemeral: true });
                    }
                });
                
                collector.on('end', async (collected, reason) => {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('trivia_0').setLabel('A').setStyle(question.answer === 0 ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('trivia_1').setLabel('B').setStyle(question.answer === 1 ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('trivia_2').setLabel('C').setStyle(question.answer === 2 ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('trivia_3').setLabel('D').setStyle(question.answer === 3 ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true)
                    );
                    
                    const resultEmbed = createPremiumEmbed({
                        title: 'Trivia Ended!',
                        titleIcon: '🧠',
                        color: winner ? PS99_COLORS.success : PS99_COLORS.error,
                        description: winner 
                            ? `\`\`\`diff\n+ Winner! +\`\`\`\n\n👑 **${winner.username}** answered correctly!\n\n✅ **Answer:** ${question.options[question.answer]}\n\n💰 **Prize:** \`${prize.toLocaleString()}\` gems`
                            : `\`\`\`diff\n- No Winner -\`\`\`\n\nNobody got it right!\n\n✅ **Correct Answer:** ${question.options[question.answer]}`,
                        footer: `Category: ${question.category}`
                    });
                    
                    await msg.edit({ embeds: [resultEmbed], components: [disabledRow] });
                });
                
            } else if (subcommand === 'hotpotato') {
                const prize = interaction.options.getInteger('prize');
                const minPlayers = interaction.options.getInteger('players') || 3;
                
                const joinRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('potato_join').setLabel('Join Game 🥔').setStyle(ButtonStyle.Success)
                );
                
                const embed = createPremiumEmbed({
                    title: 'Hot Potato!',
                    titleIcon: '🥔',
                    color: PS99_COLORS.orange,
                    description: `\`\`\`ansi\n[1;33m╭─────────────────────────────╮[0m\n[1;33m│[0m     [1;31m💣 HOT POTATO! 💣[0m     [1;33m│[0m\n[1;33m╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.gem} **Prize Pool:** \`${prize.toLocaleString()}\` gems\n👥 **Minimum Players:** \`${minPlayers}\`\n\n**Click to join!** Game starts in 30 seconds.`,
                    footer: `Hosted by ${interaction.user.username}`
                });
                
                const msg = await interaction.reply({ embeds: [embed], components: [joinRow], fetchReply: true });
                
                const players = new Set();
                
                const joinCollector = msg.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: 30000,
                    filter: (i) => i.customId === 'potato_join'
                });
                
                joinCollector.on('collect', async (i) => {
                    if (players.has(i.user.id)) {
                        return i.reply({ content: 'You already joined!', ephemeral: true });
                    }
                    players.add(i.user.id);
                    await i.reply({ content: `🥔 You joined the game! (${players.size} players)`, ephemeral: true });
                });
                
                joinCollector.on('end', async () => {
                    if (players.size < minPlayers) {
                        const cancelEmbed = createPremiumEmbed({
                            title: 'Game Cancelled',
                            titleIcon: '❌',
                            color: PS99_COLORS.error,
                            description: `Not enough players joined! Need at least ${minPlayers} players.\n\nOnly ${players.size} player(s) joined.`,
                            footer: 'Better luck next time!'
                        });
                        return msg.edit({ embeds: [cancelEmbed], components: [] });
                    }
                    
                    const playerList = Array.from(players);
                    let currentHolder = playerList[Math.floor(Math.random() * playerList.length)];
                    let round = 1;
                    let eliminated = new Set();
                    
                    const playRound = async () => {
                        if (playerList.filter(p => !eliminated.has(p)).length <= 1) {
                            const winnerId = playerList.find(p => !eliminated.has(p));
                            const winnerUser = await interaction.client.users.fetch(winnerId);
                            db.addBalance(winnerId, prize);
                            
                            const winEmbed = createPremiumEmbed({
                                title: 'Hot Potato - Winner!',
                                titleIcon: '🏆',
                                color: PS99_COLORS.gold,
                                description: `\`\`\`diff\n+ WINNER! +\`\`\`\n\n👑 **${winnerUser.username}** survived and won!\n\n💰 **Prize:** \`${prize.toLocaleString()}\` gems`,
                                footer: `Thanks for playing!`
                            });
                            return msg.edit({ embeds: [winEmbed], components: [] });
                        }
                        
                        const passRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('potato_pass').setLabel('Pass the Potato! 🥔').setStyle(ButtonStyle.Danger)
                        );
                        
                        const holderUser = await interaction.client.users.fetch(currentHolder);
                        
                        const roundEmbed = createPremiumEmbed({
                            title: 'Hot Potato!',
                            titleIcon: '🥔',
                            color: PS99_COLORS.orange,
                            description: `\`\`\`ansi\n[1;33m╭─────────────────────────────╮[0m\n[1;33m│[0m     [1;31m💣 PASS IT QUICK! 💣[0m     [1;33m│[0m\n[1;33m╰─────────────────────────────╯[0m\`\`\`\n\n${ICONS.potato} **Holding:** ${holderUser}\n🔄 **Round:** \`${round}\`\n👥 **Remaining:** \`${playerList.filter(p => !eliminated.has(p)).length}\`\n\n**${holderUser.username}, pass the potato!**`,
                            footer: `${holderUser.username} must click to pass!`
                        });
                        
                        await msg.edit({ embeds: [roundEmbed], components: [passRow] });
                        
                        const boomTime = Math.floor(Math.random() * 8000) + 3000;
                        let passed = false;
                        
                        const passCollector = msg.createMessageComponentCollector({ 
                            componentType: ComponentType.Button, 
                            time: boomTime,
                            filter: (i) => i.customId === 'potato_pass' && i.user.id === currentHolder
                        });
                        
                        passCollector.on('collect', async (i) => {
                            passed = true;
                            const remainingPlayers = playerList.filter(p => !eliminated.has(p) && p !== currentHolder);
                            currentHolder = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
                            await i.reply({ content: '🥔 Passed!', ephemeral: true });
                            passCollector.stop('passed');
                            round++;
                            playRound();
                        });
                        
                        passCollector.on('end', async (collected, reason) => {
                            if (reason !== 'passed') {
                                eliminated.add(currentHolder);
                                const eliminatedUser = await interaction.client.users.fetch(currentHolder);
                                
                                const boomEmbed = createPremiumEmbed({
                                    title: 'BOOM!',
                                    titleIcon: '💥',
                                    color: PS99_COLORS.error,
                                    description: `\`\`\`diff\n- ELIMINATED! -\`\`\`\n\n💥 **${eliminatedUser.username}** held the potato too long!\n\n👥 **Remaining:** \`${playerList.filter(p => !eliminated.has(p)).length}\``,
                                    footer: `Round ${round}`
                                });
                                
                                await msg.edit({ embeds: [boomEmbed], components: [] });
                                
                                const remainingPlayers = playerList.filter(p => !eliminated.has(p));
                                if (remainingPlayers.length > 0) {
                                    currentHolder = remainingPlayers[Math.floor(Math.random() * remainingPlayers.length)];
                                    round++;
                                    setTimeout(playRound, 3000);
                                } else {
                                    playRound();
                                }
                            }
                        });
                    };
                    
                    playRound();
                });
                
            } else if (subcommand === 'mysterybox') {
                const tier = interaction.options.getString('tier');
                
                const prizes = {
                    common: [
                        { name: '100 gems', amount: 100, chance: 40 },
                        { name: '250 gems', amount: 250, chance: 30 },
                        { name: '500 gems', amount: 500, chance: 20 },
                        { name: '1,000 gems', amount: 1000, chance: 10 }
                    ],
                    rare: [
                        { name: '500 gems', amount: 500, chance: 30 },
                        { name: '1,000 gems', amount: 1000, chance: 30 },
                        { name: '2,500 gems', amount: 2500, chance: 25 },
                        { name: '5,000 gems', amount: 5000, chance: 15 }
                    ],
                    epic: [
                        { name: '2,500 gems', amount: 2500, chance: 30 },
                        { name: '5,000 gems', amount: 5000, chance: 30 },
                        { name: '10,000 gems', amount: 10000, chance: 25 },
                        { name: '25,000 gems', amount: 25000, chance: 15 }
                    ],
                    legendary: [
                        { name: '10,000 gems', amount: 10000, chance: 25 },
                        { name: '25,000 gems', amount: 25000, chance: 30 },
                        { name: '50,000 gems', amount: 50000, chance: 30 },
                        { name: '100,000 gems', amount: 100000, chance: 15 }
                    ]
                };
                
                const tierColors = {
                    common: PS99_COLORS.info,
                    rare: PS99_COLORS.purple,
                    epic: PS99_COLORS.pink,
                    legendary: PS99_COLORS.legendary
                };
                
                const tierEmojis = {
                    common: '📦',
                    rare: '🎁',
                    epic: '💜',
                    legendary: '👑'
                };
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('mystery_open').setLabel('Open Box! 🎁').setStyle(ButtonStyle.Primary)
                );
                
                const embed = createPremiumEmbed({
                    title: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Mystery Box`,
                    titleIcon: tierEmojis[tier],
                    color: tierColors[tier],
                    description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35m│[0m    [1;33m✨ MYSTERY BOX ✨[0m    [1;35m│[0m\n[1;35m╰─────────────────────────────╯[0m\`\`\`\n\n**Possible Prizes:**\n${prizes[tier].map(p => `• ${p.name} (${p.chance}%)`).join('\n')}\n\n**First click opens the box!**`,
                    footer: `${tier.toUpperCase()} tier | Hosted by ${interaction.user.username}`
                });
                
                const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
                
                const collector = msg.createMessageComponentCollector({ 
                    componentType: ComponentType.Button, 
                    time: 60000,
                    max: 1
                });
                
                collector.on('collect', async (i) => {
                    const roll = Math.random() * 100;
                    let cumulative = 0;
                    let wonPrize = prizes[tier][0];
                    
                    for (const prize of prizes[tier]) {
                        cumulative += prize.chance;
                        if (roll <= cumulative) {
                            wonPrize = prize;
                            break;
                        }
                    }
                    
                    db.addBalance(i.user.id, wonPrize.amount);
                    
                    const resultEmbed = createPremiumEmbed({
                        title: 'Mystery Box Opened!',
                        titleIcon: '🎊',
                        color: tierColors[tier],
                        description: `\`\`\`diff\n+ PRIZE CLAIMED! +\`\`\`\n\n👑 **${i.user.username}** opened the box!\n\n🎁 **Won:** \`${wonPrize.name}\``,
                        footer: `${tier.toUpperCase()} tier box`
                    });
                    
                    await msg.edit({ embeds: [resultEmbed], components: [] });
                    await i.reply({ content: `🎉 You won **${wonPrize.name}**!`, ephemeral: true });
                });
                
                collector.on('end', async (collected) => {
                    if (collected.size === 0) {
                        const expiredEmbed = createPremiumEmbed({
                            title: 'Mystery Box Expired',
                            titleIcon: '📦',
                            color: PS99_COLORS.error,
                            description: 'Nobody opened the box in time!\n\nThe box has vanished...',
                            footer: 'Better luck next time!'
                        });
                        await msg.edit({ embeds: [expiredEmbed], components: [] });
                    }
                });
            }
        }
    }
};
