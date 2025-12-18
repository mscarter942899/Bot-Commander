const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function generateCrashPoint(rtp) {
    const houseEdge = 1 - rtp;
    const r = Math.random();
    if (r < houseEdge) return 1.0;
    return 1 / (1 - r);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limbo')
        .setDescription('Bet on a target multiplier in Limbo!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addNumberOption(opt =>
            opt.setName('target')
                .setDescription('Target multiplier (1.01 - 100)')
                .setRequired(true)
                .setMinValue(1.01)
                .setMaxValue(100)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('limbo');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Limbo is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        const target = interaction.options.getNumber('target');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const playEmbed = createGameEmbed({
            game: 'limbo',
            title: '📉 LIMBO 📉',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     📉 GENERATING... 📉     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎯 **Target:** \`${target.toFixed(2)}x\`\n\n⏳ Generating random multiplier...`,
            color: PS99_COLORS.purple,
            bet: bet
        });

        await interaction.reply({ embeds: [playEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const rtp = settings.rtp || 0.96;
        const result = generateCrashPoint(rtp);
        const won = result >= target;
        const winnings = won ? Math.floor(bet * target) : 0;

        if (won) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (target >= 10) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Limbo', winnings, target);
            }

            const embed = createWinEmbed('Limbo', winnings, target, 
                `📊 **Result:** \`${result.toFixed(2)}x\`\n🎯 **Target:** \`${target.toFixed(2)}x\`\n\n✨ The result was higher than your target!`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Limbo', bet, 
                `📊 **Result:** \`${result.toFixed(2)}x\`\n🎯 **Target:** \`${target.toFixed(2)}x\`\n\n💀 The result was lower than your target!`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
