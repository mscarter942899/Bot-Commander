const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'coinflip',
    aliases: ['cf', 'flip'],
    description: 'Flip a coin',
    usage: '!coinflip <bet> <heads/tails>',
    async execute(message, args, client) {
        const settings = db.getGameSettings('coinflip');
        if (!settings.enabled) {
            return message.reply({ embeds: [createErrorEmbed('Coinflip is currently disabled!')] });
        }
        
        if (args.length < 2) {
            return message.reply({ embeds: [createErrorEmbed('Usage: !coinflip <bet> <heads/tails>')] });
        }
        
        const bet = parseInt(args[0]);
        const choice = args[1].toLowerCase();
        
        if (isNaN(bet) || bet < settings.minBet) {
            return message.reply({ embeds: [createErrorEmbed(`Minimum bet is ${settings.minBet} gems!`)] });
        }
        
        if (!['heads', 'tails', 'h', 't'].includes(choice)) {
            return message.reply({ embeds: [createErrorEmbed('Choose heads or tails!')] });
        }
        
        const finalChoice = choice === 'h' ? 'heads' : choice === 't' ? 'tails' : choice;
        
        const user = db.getUser(message.author.id, message.author.username);
        
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        db.removeBalance(message.author.id, bet);
        
        const result = Math.random() < 0.48 ? 'heads' : 'tails';
        const won = finalChoice === result;
        
        if (won) {
            const winAmount = bet * 2;
            db.addBalance(message.author.id, winAmount);
            db.recordGame(message.author.id, true, bet, winAmount);
        } else {
            db.recordGame(message.author.id, false, bet, 0);
        }
        
        const resultEmoji = result === 'heads' ? '👑' : '🦅';
        
        const embed = new EmbedBuilder()
            .setTitle('🪙 COINFLIP')
            .setColor(won ? PS99_COLORS.success : PS99_COLORS.error)
            .setDescription(`${resultEmoji} **${result.toUpperCase()}**\n\n${won ? `🎉 Won \`${(bet * 2).toLocaleString()}\` gems!` : `😢 Lost \`${bet.toLocaleString()}\` gems`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' });
        
        message.reply({ embeds: [embed] });
    }
};
