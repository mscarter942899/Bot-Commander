
const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'wheel',
    aliases: ['spin', 'fortune'],
    description: 'Spin the fortune wheel',
    
    async execute(message, args, client) {
        const bet = parseInt(args[0]);
        
        if (isNaN(bet) || bet < 10) {
            return message.reply({ embeds: [createErrorEmbed('Please enter a valid bet (minimum 10)! Usage: `!wheel <bet>`')] });
        }
        
        const user = db.getUser(message.author.id, message.author.username);
        if (user.balance < bet) {
            return message.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)] });
        }
        
        const wheelCommand = client.commands.get('wheel');
        const fakeInteraction = {
            user: message.author,
            options: { getInteger: () => bet },
            reply: (opts) => message.reply(opts),
            editReply: async (opts) => {
                const messages = await message.channel.messages.fetch({ limit: 5 });
                const botMessage = messages.find(m => m.author.id === client.user.id);
                if (botMessage) return botMessage.edit(opts);
            },
            replied: false,
            deferred: false
        };
        
        await wheelCommand.execute(fakeInteraction, client);
    }
};
