const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function getTile() {
    return Math.floor(Math.random() * 6) + 1;
}

function getHandValue(tiles) {
    const sum = tiles.reduce((a, b) => a + b, 0);
    return sum % 10;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paigow')
        .setDescription('Play simplified Pai Gow!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('paigow');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Pai Gow is currently disabled!')], ephemeral: true });
        }

        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const dealEmbed = createGameEmbed({
            game: 'paigow',
            title: '🀄 PAI GOW 🀄',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      🀄 DEALING... 🀄      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n\n🎴 Dealing tiles...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [dealEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const playerHigh = [getTile(), getTile()];
        const playerLow = [getTile(), getTile()];
        const dealerHigh = [getTile(), getTile()];
        const dealerLow = [getTile(), getTile()];

        const playerHighValue = getHandValue(playerHigh);
        const playerLowValue = getHandValue(playerLow);
        const dealerHighValue = getHandValue(dealerHigh);
        const dealerLowValue = getHandValue(dealerLow);

        const highWin = playerHighValue > dealerHighValue;
        const lowWin = playerLowValue > dealerLowValue;
        const highTie = playerHighValue === dealerHighValue;
        const lowTie = playerLowValue === dealerLowValue;

        let result;
        let winnings = 0;
        let multiplier = 0;

        if (highWin && lowWin) {
            result = 'win';
            multiplier = 2;
            winnings = bet * 2;
        } else if (!highWin && !lowWin && !highTie && !lowTie) {
            result = 'lose';
        } else {
            result = 'push';
            multiplier = 1;
            winnings = bet;
        }

        const handDisplay = `👤 **Your Hands:**\n🔴 High: \`${playerHigh.join(' + ')}\` = **${playerHighValue}**\n🔵 Low: \`${playerLow.join(' + ')}\` = **${playerLowValue}**\n\n🏦 **Dealer Hands:**\n🔴 High: \`${dealerHigh.join(' + ')}\` = **${dealerHighValue}**\n🔵 Low: \`${dealerLow.join(' + ')}\` = **${dealerLowValue}**`;

        if (result === 'win') {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            const embed = createWinEmbed('Pai Gow', winnings, multiplier, handDisplay);
            await interaction.editReply({ embeds: [embed] });
        } else if (result === 'push') {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);

            const embed = createGameEmbed({
                game: 'paigow',
                title: '🀄 PAI GOW - PUSH 🀄',
                description: `\`\`\`diff\n= PUSH =\`\`\`\n\n${handDisplay}\n\n🤝 Split decision! Your bet has been returned.`,
                color: PS99_COLORS.info,
                bet: bet
            });
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Pai Gow', bet, handDisplay);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
