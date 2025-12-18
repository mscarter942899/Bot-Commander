const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fantan')
        .setDescription('Play Fan Tan!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addIntegerOption(opt =>
            opt.setName('number')
                .setDescription('Pick a number (1-4)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(4)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('fantan');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Fan Tan is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        const choice = interaction.options.getInteger('number');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const countEmbed = createGameEmbed({
            game: 'fantan',
            title: '⭕ FAN TAN ⭕',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     ⭕ COUNTING... ⭕     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎯 **Your Number:** \`${choice}\`\n\n🔢 Counting the beads...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [countEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const totalBeads = Math.floor(Math.random() * 100) + 50;
        const remainder = (totalBeads % 4) || 4;
        const won = remainder === choice;
        const multiplier = 3.75;
        const winnings = won ? Math.floor(bet * multiplier) : 0;

        const resultDisplay = `🔢 **Total Beads:** \`${totalBeads}\`\n➗ **Remainder:** \`${totalBeads} ÷ 4 = ${Math.floor(totalBeads/4)} remainder ${remainder}\`\n\n🎯 **Winning Number:** \`${remainder}\`\n🎲 **Your Choice:** \`${choice}\``;

        if (won) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            const embed = createWinEmbed('Fan Tan', winnings, multiplier, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Fan Tan', bet, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
