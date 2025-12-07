const db = require('../database/db');
const { EmbedBuilder } = require('discord.js');
const { PS99_COLORS } = require('../utils/embedBuilder');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'items'],
    description: 'View your inventory',
    usage: '!inventory',
    async execute(message, args, client) {
        const items = db.getInventory(message.author.id);
        
        if (items.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`🎒 ${message.author.username}'s Inventory`)
                .setColor(PS99_COLORS.purple)
                .setDescription('Your inventory is empty!\n\nBuy items from `/shop browse` or win them in raffles!')
                .setFooter({ text: '💎 PS99 Casino 💎' });
            
            return message.reply({ embeds: [embed] });
        }
        
        let description = '';
        items.slice(0, 10).forEach((item, i) => {
            const source = item.source === 'shop' ? '🛒' : item.source === 'raffle' ? '🎟️' : '🎁';
            description += `**${i + 1}.** ${source} ${item.name}\n`;
        });
        
        if (items.length > 10) {
            description += `\n*... and ${items.length - 10} more items*`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`🎒 ${message.author.username}'s Inventory`)
            .setColor(PS99_COLORS.purple)
            .setDescription(description)
            .setFooter({ text: `${items.length} items | 💎 PS99 Casino 💎` });
        
        message.reply({ embeds: [embed] });
    }
};
