const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

const DICE_EMOJIS = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
    name: 'dice',
    aliases: ['roll'],
    description: 'Roll the dice',
    usage: '!dice <bet> <high/low/seven/even/odd>',
    async execute(message, args, client) {
        const settings = db.getGameSettings('dice');
        if (!settings.enabled) {
            return message.reply({ embeds: [createErrorEmbed('Dice is currently disabled!')] });
        }
        
        if (args.length < 2) {
            return message.reply({ embeds: [createErrorEmbed('Usage: !dice <bet> <high/low/seven/even/odd>')] });
        }
        
        const bet = parseInt(args[0]);
        const betType = args[1].toLowerCase();
        
        if (isNaN(bet) || bet < settings.minBet) {
            return message.reply({ embeds: [createErrorEmbed(`Minimum bet is ${settings.minBet} gems!`)] });
        }
        
        if (!['high', 'low', 'seven', 'even', 'odd'].includes(betType)) {
            return message.reply({ embeds: [createErrorEmbed('Valid bets: high, low, seven, even, odd')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        db.removeBalance(message.author.id, bet);
        
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const total = dice1 + dice2;
        
        let payout = 0;
        switch (betType) {
            case 'high': payout = total >= 8 ? 2 : 0; break;
            case 'low': payout = total <= 6 ? 2 : 0; break;
            case 'seven': payout = total === 7 ? 4 : 0; break;
            case 'even': payout = total % 2 === 0 ? 2 : 0; break;
            case 'odd': payout = total % 2 === 1 ? 2 : 0; break;
        }
        
        const winAmount = bet * payout;
        
        if (payout > 0) {
            db.addBalance(message.author.id, winAmount);
            db.recordGame(message.author.id, true, bet, winAmount);
        } else {
            db.recordGame(message.author.id, false, bet, 0);
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 DICE')
            .setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error)
            .setDescription(`${DICE_EMOJIS[dice1-1]} ${DICE_EMOJIS[dice2-1]} = **${total}**\n\n${payout > 0 ? `🎉 Won \`${winAmount.toLocaleString()}\` gems!` : `😢 Lost \`${bet.toLocaleString()}\` gems`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' });
        
        message.reply({ embeds: [embed] });
    }
};
