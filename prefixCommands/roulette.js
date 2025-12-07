const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

const ROULETTE_NUMBERS = {
    0: 'green', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
    7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
    13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
    19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
    25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
    31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

function calculatePayout(betType, result) {
    const resultColor = ROULETTE_NUMBERS[result];
    switch (betType) {
        case 'red': return resultColor === 'red' ? 2 : 0;
        case 'black': return resultColor === 'black' ? 2 : 0;
        case 'green': return result === 0 ? 35 : 0;
        case 'even': return result !== 0 && result % 2 === 0 ? 2 : 0;
        case 'odd': return result % 2 === 1 ? 2 : 0;
        default: return 0;
    }
}

module.exports = {
    name: 'roulette',
    aliases: ['rl'],
    description: 'Play roulette',
    usage: '!roulette <bet> <red/black/green/even/odd>',
    async execute(message, args, client) {
        const settings = db.getGameSettings('roulette');
        if (!settings.enabled) {
            return message.reply({ embeds: [createErrorEmbed('Roulette is currently disabled!')] });
        }
        
        if (args.length < 2) {
            return message.reply({ embeds: [createErrorEmbed('Usage: !roulette <bet> <red/black/green/even/odd>')] });
        }
        
        const bet = parseInt(args[0]);
        const betType = args[1].toLowerCase();
        
        if (isNaN(bet) || bet < settings.minBet) {
            return message.reply({ embeds: [createErrorEmbed(`Minimum bet is ${settings.minBet} gems!`)] });
        }
        
        if (!['red', 'black', 'green', 'even', 'odd'].includes(betType)) {
            return message.reply({ embeds: [createErrorEmbed('Valid bets: red, black, green, even, odd')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        db.removeBalance(message.author.id, bet);
        
        const result = Math.floor(Math.random() * 37);
        const payout = calculatePayout(betType, result);
        const winAmount = bet * payout;
        
        if (payout > 0) {
            db.addBalance(message.author.id, winAmount);
            db.recordGame(message.author.id, true, bet, winAmount);
        } else {
            db.recordGame(message.author.id, false, bet, 0);
        }
        
        const color = ROULETTE_NUMBERS[result];
        const colorEmoji = { red: '🔴', black: '⚫', green: '🟢' }[color];
        
        const embed = new EmbedBuilder()
            .setTitle('🎰 ROULETTE')
            .setColor(payout > 0 ? PS99_COLORS.success : PS99_COLORS.error)
            .setDescription(`${colorEmoji} **${result}** (${color})\n\n${payout > 0 ? `🎉 Won \`${winAmount.toLocaleString()}\` gems!` : `😢 Lost \`${bet.toLocaleString()}\` gems`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' });
        
        message.reply({ embeds: [embed] });
    }
};
