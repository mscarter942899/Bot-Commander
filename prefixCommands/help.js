const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    name: 'help',
    aliases: ['commands', 'h', 'cmds'],
    description: 'View all commands',
    
    async execute(message, args, client) {
        const embed = new EmbedBuilder()
            .setTitle('🎰 ═══ PS99 CASINO COMMANDS ═══ 🎰')
            .setColor(PS99_COLORS.gold)
            .setDescription('All commands work with both slash (/) and prefix (!) commands!')
            .addFields(
                {
                    name: '💰 Economy',
                    value: '`!bal` - Check balance\n`!daily` - Claim daily\n`!gift @user amount` - Gift gems\n`!deposit amount` - Deposit to bank\n`!withdraw amount` - Withdraw from bank\n`!top` - Leaderboard\n`!profile` - View stats',
                    inline: false
                },
                {
                    name: '🎰 Gambling Games',
                    value: '`!slots <bet>` - Slot machine\n`!bj <bet>` - Blackjack\n`!poker <bet>` - Texas Hold\'em\n`!hl <bet>` - Higher or Lower\n`!war <bet>` - Card War\n`!roulette <bet> <color>` - Roulette\n`!coinflip <bet> <h/t>` - Coinflip\n`!dice <bet> <type>` - Dice',
                    inline: false
                },
                {
                    name: '🛒 Shop & Inventory',
                    value: '`!shop` - View shop\n`!shop buy <id>` - Buy item\n`!inv` - View inventory',
                    inline: false
                },
                {
                    name: '🎟️ Raffle',
                    value: '`!raffle` - View active raffle',
                    inline: false
                }
            )
            .setFooter({ text: '💎 Use /help for full list! 💎' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};
