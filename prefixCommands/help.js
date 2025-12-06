const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    name: 'help',
    aliases: ['commands', 'h'],
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
                    name: '🎰 Games',
                    value: '`!slots <bet>` - Slot machine\n`!bj <bet>` - Blackjack\n`!poker <bet>` - Texas Hold\'em\n`!hl <bet>` - Higher or Lower\n`!war <bet>` - Card War',
                    inline: false
                },
                {
                    name: '🎟️ Raffle',
                    value: '`!raffle` - View active raffle\n`!raffle start` - Start raffle (Admin)\n`!raffle end` - End raffle (Admin)',
                    inline: false
                }
            )
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};
