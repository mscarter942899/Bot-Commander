const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const WHEEL_SEGMENTS = [
    { label: '0.5x', multiplier: 0.5, weight: 25 },
    { label: '1x', multiplier: 1, weight: 20 },
    { label: '1.5x', multiplier: 1.5, weight: 18 },
    { label: '2x', multiplier: 2, weight: 15 },
    { label: '3x', multiplier: 3, weight: 10 },
    { label: '5x', multiplier: 5, weight: 6 },
    { label: '10x', multiplier: 10, weight: 4 },
    { label: '25x', multiplier: 25, weight: 1.5 },
    { label: '💀 BUST', multiplier: 0, weight: 0.5 }
];

function spinWheel() {
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    for (const segment of WHEEL_SEGMENTS) {
        random -= segment.weight;
        if (random <= 0) return segment;
    }
    return WHEEL_SEGMENTS[0];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wheeloffortune')
        .setDescription('Spin the Wheel of Fortune!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('wheeloffortune') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Wheel of Fortune is disabled!')], ephemeral: true });
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
        
        const spinEmbed = new EmbedBuilder()
            .setTitle('🎡 ═══ WHEEL OF FORTUNE ═══ 🎡')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n🎡 **Spinning the wheel...**\n\n\`\`\`\n   🔻\n ╭─────╮\n │ ??? │\n ╰─────╯\n\`\`\``)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [spinEmbed] });
        
        const spinFrames = ['0.5x', '2x', '5x', '1x', '10x', '3x', '1.5x', '25x'];
        for (let i = 0; i < 8; i++) {
            await new Promise(r => setTimeout(r, 300));
            spinEmbed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n🎡 **Spinning...**\n\n\`\`\`\n   🔻\n ╭─────╮\n │ ${spinFrames[i].padStart(3)} │\n ╰─────╯\n\`\`\``);
            await interaction.editReply({ embeds: [spinEmbed] });
        }
        
        await new Promise(r => setTimeout(r, 500));
        
        const result = spinWheel();
        const winAmount = Math.floor(bet * result.multiplier);
        
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎡 ═══ WHEEL OF FORTUNE ═══ 🎡')
            .setColor(result.multiplier > 0 ? (result.multiplier >= 5 ? PS99_COLORS.rainbow : PS99_COLORS.success) : PS99_COLORS.error)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n🎯 **Result: ${result.label}**\n\n\`\`\`\n   🔻\n ╭─────╮\n │ ${result.label.padStart(3)} │\n ╰─────╯\n\`\`\`\n\n${result.multiplier > 0 ? `🎉 **You won \`${winAmount.toLocaleString()}\` gems!**` : `💀 **BUST! You lost \`${bet.toLocaleString()}\` gems!**`}`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        if (result.multiplier > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            if (result.multiplier >= 10) {
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Wheel of Fortune', winAmount, result.multiplier);
            }
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'wheeloffortune',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet, result: result.label, multiplier: result.multiplier, winAmount, won: result.multiplier > 0
        });
        
        await interaction.editReply({ embeds: [resultEmbed] });
    }
};
