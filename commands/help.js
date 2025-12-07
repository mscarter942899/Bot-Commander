const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands'),
    
    async execute(interaction) {
        const mainEmbed = new EmbedBuilder()
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
                    value: '`/slots` - Slot machine\n`/blackjack` - Blackjack 21\n`/poker` - Texas Hold\'em\n`/highlow` - Higher or Lower\n`/war` - Card War\n`/roulette` - Roulette wheel\n`/baccarat` - Baccarat\n`/crash` - Crash game\n`/dice` - Dice roll\n`/mines` - Minesweeper\n`/coinflip` - Coin flip',
                    inline: false
                },
                {
                    name: '🛒 Shop & Inventory',
                    value: '`/shop browse` - Browse shop items\n`/shop buy <id>` - Buy an item\n`/inventory view` - View your items\n`/inventory gift` - Gift items to others',
                    inline: false
                },
                {
                    name: '🎟️ Raffles',
                    value: '**Gem Raffles:**\n`/raffle view` - View gem raffle\n`/raffle history` - Past gem raffles\n\n**Item Raffles:**\n`/itemraffle view` - View item raffle\n`/itemraffle history` - Past item raffles',
                    inline: false
                },
                {
                    name: '🛡️ Admin Commands',
                    value: '`/addgems` `/removegems` - Manage user gems\n`/admin games` - Configure game settings\n`/admin economy` - Economy management\n`/admin inventory` - Grant/clear items\n`/admin fun` - Fun commands\n`/shop add/edit/remove` - Manage shop\n`/raffle start/end` - Manage gem raffles\n`/itemraffle start/end` - Manage item raffles',
                    inline: false
                },
                {
                    name: '📝 Prefix Commands',
                    value: 'All commands work with `!` prefix:\n`!bal`, `!daily`, `!slots`, `!bj`, `!poker`, `!hl`, `!war`, `!roulette`, `!coinflip`, `!dice`, `!shop`, `!inv`, `!help`',
                    inline: false
                }
            )
            .setFooter({ text: '💎 PS99 Casino - Good luck! 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [mainEmbed] });
    }
};
