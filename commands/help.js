const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🎰 ═══ PS99 CASINO COMMANDS ═══ 🎰')
            .setColor(PS99_COLORS.gold)
            .setDescription('Welcome to PS99 Casino! Here are all available commands:')
            .addFields(
                {
                    name: '💰 Economy',
                    value: '`/balance` - Check your gems\n`/daily` - Claim daily reward\n`/gift` - Gift gems to a user\n`/deposit` - Deposit to bank\n`/withdraw` - Withdraw from bank\n`/top` - View leaderboard\n`/profile` - View your stats',
                    inline: false
                },
                {
                    name: '🎰 Gambling Games',
                    value: '`/slots` - Play slot machine\n`/blackjack` - Play blackjack\n`/poker` - Texas Hold\'em\n`/highlow` - Higher or Lower\n`/war` - Card War',
                    inline: false
                },
                {
                    name: '🎟️ Raffle',
                    value: '`/raffle view` - View active raffle\n`/raffle history` - View past raffles',
                    inline: false
                },
                {
                    name: '🛡️ Admin Commands',
                    value: '`/addgems` - Add gems to user\n`/removegems` - Remove gems from user\n`/raffle start` - Start a raffle\n`/raffle end` - End raffle\n`/raffle cancel` - Cancel raffle\n`/announce` - Make announcement\n`/houseprofit` - View house stats\n`/setlogs` - Set log channel',
                    inline: false
                },
                {
                    name: '📝 Prefix Commands',
                    value: 'All commands also work with `!` prefix:\n`!bal`, `!daily`, `!gift`, `!deposit`, `!withdraw`, `!top`, `!profile`, `!slots`, `!bj`, `!poker`, `!hl`, `!war`, `!raffle`, `!help`',
                    inline: false
                }
            )
            .setFooter({ text: '💎 PS99 Casino - Good luck! 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
