const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

module.exports = {
    name: 'withdraw',
    aliases: ['with', 'wd'],
    description: 'Withdraw gems from your bank',
    
    async execute(message, args, client) {
        try {
            const amountStr = (args[0] || '').toLowerCase();
            const user = db.getUser(message.author.id, message.author.username);
            
            let amount;
            if (amountStr === 'all') {
                amount = user.bank;
            } else {
                amount = parseGemAmount(amountStr);
            }
            
            if (isNaN(amount) || amount <= 0) {
                return message.reply({ embeds: [createErrorEmbed('Please enter a valid amount! Usage: `!withdraw <amount|all>`')] });
            }
            
            if (user.bank < amount) {
                return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems in your bank! You have \`${user.bank.toLocaleString()}\` gems.`)] });
            }
            
            db.withdrawFromBank(message.author.id, amount);
            
            const embed = createPS99Embed({
                title: '🏦 Withdrawal Successful!',
                color: PS99_COLORS.success,
                description: `You withdrew **${amount.toLocaleString()}** gems from your bank!`,
                fields: [
                    { name: '💰 Cash', value: `\`${(user.balance + amount).toLocaleString()}\` gems`, inline: true },
                    { name: '🏦 Bank', value: `\`${(user.bank - amount).toLocaleString()}\` gems`, inline: true }
                ]
            });
            
            await message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in prefix withdraw:', error);
            await message.reply({ embeds: [createErrorEmbed('An error occurred while withdrawing!')] });
        }
    }
};
