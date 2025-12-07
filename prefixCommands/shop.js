const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    name: 'shop',
    aliases: ['store'],
    description: 'View the shop',
    usage: '!shop [buy <id>]',
    async execute(message, args, client) {
        if (args.length > 0 && args[0].toLowerCase() === 'buy') {
            const itemId = parseInt(args[1]);
            
            if (isNaN(itemId)) {
                return message.reply({ embeds: [createErrorEmbed('Usage: !shop buy <id>')] });
            }
            
            const result = db.buyShopItem(message.author.id, itemId);
            
            if (!result.success) {
                return message.reply({ embeds: [createErrorEmbed(result.reason)] });
            }
            
            return message.reply({ 
                embeds: [createSuccessEmbed('Purchase Complete!', `You bought **${result.item.name}** for \`${result.item.price.toLocaleString()}\` gems!`)] 
            });
        }
        
        const items = db.getShopItems();
        
        if (items.length === 0) {
            return message.reply({ embeds: [new EmbedBuilder().setTitle('🛒 Shop').setDescription('The shop is empty!').setColor(PS99_COLORS.info)] });
        }
        
        let description = '';
        items.slice(0, 10).forEach((item, i) => {
            const stock = item.stock === null ? '∞' : item.stock;
            description += `**${item.id}.** ${item.name} - \`${item.price.toLocaleString()}\` gems (${stock})\n`;
        });
        
        description += `\n*Use \`!shop buy <id>\` to purchase*`;
        
        const embed = new EmbedBuilder()
            .setTitle('🛒 Shop')
            .setColor(PS99_COLORS.neon)
            .setDescription(description)
            .setFooter({ text: '💎 PS99 Casino 💎' });
        
        message.reply({ embeds: [embed] });
    }
};
