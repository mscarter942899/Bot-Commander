const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const BOXES = [
    { emoji: '📦', rarity: 'Common', minMult: 0, maxMult: 1.5, color: '#808080' },
    { emoji: '🎁', rarity: 'Uncommon', minMult: 1, maxMult: 3, color: '#00FF00' },
    { emoji: '💝', rarity: 'Rare', minMult: 2, maxMult: 5, color: '#0000FF' },
    { emoji: '👑', rarity: 'Epic', minMult: 3, maxMult: 10, color: '#800080' },
    { emoji: '💎', rarity: 'Legendary', minMult: 5, maxMult: 25, color: '#FFD700' }
];

function getRandomBox() {
    const roll = Math.random() * 100;
    if (roll < 40) return BOXES[0];
    if (roll < 70) return BOXES[1];
    if (roll < 90) return BOXES[2];
    if (roll < 98) return BOXES[3];
    return BOXES[4];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('luckybox')
        .setDescription('Open a mystery lucky box!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('luckybox') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Lucky Box is disabled!')], ephemeral: true });
        }
        
        if (bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Minimum bet is \`${settings.minBet}\` gems!`)], ephemeral: true });
        }
        
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Insufficient balance! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 ═══ LUCKY BOX ═══ 🎁')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n📦 📦 📦 📦 📦\n\n**Opening mystery box...**`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 400));
            const shuffled = ['📦', '🎁', '💝', '👑', '💎'].sort(() => Math.random() - 0.5);
            embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n${shuffled.join(' ')}\n\n**Shuffling...**`);
            await interaction.editReply({ embeds: [embed] });
        }
        
        await new Promise(r => setTimeout(r, 500));
        
        const box = getRandomBox();
        const multiplier = box.minMult + Math.random() * (box.maxMult - box.minMult);
        const winAmount = Math.floor(bet * multiplier);
        
        embed.setColor(box.color);
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n${box.emoji} ${box.emoji} ${box.emoji}\n\n**${box.rarity} Box!**\n\n${winAmount > 0 ? `🎉 You won **\`${winAmount.toLocaleString()}\` gems!** (${multiplier.toFixed(2)}x)` : `😢 Empty box! Lost **\`${bet.toLocaleString()}\` gems**`}`);
        
        if (winAmount > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            if (multiplier >= 5) {
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Lucky Box', winAmount, multiplier);
            }
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({ type: 'luckybox', userId: interaction.user.id, username: interaction.user.username, bet, box: box.rarity, multiplier, winAmount, won: winAmount > 0 });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
