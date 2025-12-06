const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'highlow',
    aliases: ['hl', 'hilo'],
    description: 'Play higher or lower',
    
    async execute(message, args, client) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 10) {
            return message.reply({ embeds: [createErrorEmbed('Please enter a valid bet (minimum 10)! Usage: `!hl <bet>`')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        const hlCommand = client.commands.get('highlow');
        const fakeInteraction = {
            user: message.author,
            options: { getInteger: () => bet },
            reply: (opts) => message.reply(opts),
            replied: false,
            deferred: false
        };
        
        await hlCommand.execute(fakeInteraction, client);
    }
};
