const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'poker',
    aliases: ['holdem', 'texas'],
    description: 'Play Texas Hold\'em poker',
    
    async execute(message, args, client) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 50) {
            return message.reply({ embeds: [createErrorEmbed('Please enter a valid bet (minimum 50)! Usage: `!poker <bet>`')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        if (user.balance < bet * 3) {
            return message.reply({ embeds: [createErrorEmbed(`You need at least ${(bet * 3).toLocaleString()} gems to play!`)] });
        }
        
        const pokerCommand = client.commands.get('poker');
        const fakeInteraction = {
            user: message.author,
            options: { getInteger: () => bet },
            reply: (opts) => message.reply(opts),
            replied: false,
            deferred: false
        };
        
        await pokerCommand.execute(fakeInteraction, client);
    }
};
