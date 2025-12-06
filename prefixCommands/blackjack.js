const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    description: 'Play blackjack',
    
    async execute(message, args, client) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 10) {
            return message.reply({ embeds: [createErrorEmbed('Please enter a valid bet (minimum 10)! Usage: `!bj <bet>`')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        const bjCommand = client.commands.get('blackjack');
        const fakeInteraction = {
            user: message.author,
            options: { getInteger: () => bet },
            reply: (opts) => message.reply(opts),
            replied: false,
            deferred: false
        };
        
        await bjCommand.execute(fakeInteraction, client);
    }
};
