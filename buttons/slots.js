const db = require('../database/db');
const { createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    customId: 'slots',
    
    async execute(interaction, client) {
        const [action, type, betStr] = interaction.customId.split('_');
        let bet = parseInt(betStr);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (type === 'double') {
            bet = bet * 2;
        } else if (type === 'max') {
            bet = Math.min(user.balance, 10000);
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        const slotsCommand = client.commands.get('slots');
        interaction.options = {
            getInteger: (name) => name === 'bet' ? bet : null
        };
        
        await slotsCommand.execute(interaction, client);
    }
};
