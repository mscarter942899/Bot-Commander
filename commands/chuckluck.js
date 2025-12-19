const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');
const { parseGemAmount } = require('../utils/numberParser');

function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chuckluck')
        .setDescription('Play Chuck-a-Luck!')
        .addStringOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet (e.g., "1000", "5m", "2.5b")')
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('number')
                .setDescription('Pick a number (1-6)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(6)),

    async execute(interaction, client) {
        const settings = db.getGameSettings('chuckluck');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Chuck-a-Luck is currently disabled!')], ephemeral: true });
        }

        const bet = parseGemAmount(interaction.options.getString('bet'));
        const choice = interaction.options.getInteger('number');
        
        if (bet <= 0 || bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Please enter a valid bet between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const rollEmbed = createGameEmbed({
            game: 'chuckluck',
            title: '🎲 CHUCK-A-LUCK 🎲',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     🎲 ROLLING... 🎲     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎯 **Your Number:** \`${choice}\`\n\n🎲 Rolling three dice...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [rollEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const dice = rollDice();
        const matches = dice.filter(d => d === choice).length;

        let multiplier;
        switch (matches) {
            case 3: multiplier = 11; break;
            case 2: multiplier = 3; break;
            case 1: multiplier = 2; break;
            default: multiplier = 0;
        }

        const winnings = bet * multiplier;
        const diceEmoji = dice.map(d => {
            const emojis = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            return d === choice ? `**${emojis[d]}**` : emojis[d];
        }).join(' ');

        const resultDisplay = `🎲 **Dice:** ${diceEmoji}\n📊 **Values:** ${dice.join(', ')}\n🎯 **Your Number:** \`${choice}\`\n✨ **Matches:** \`${matches}\``;

        if (matches > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (matches === 3) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Chuck-a-Luck', winnings, multiplier);
            }

            const embed = createWinEmbed('Chuck-a-Luck', winnings, multiplier, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Chuck-a-Luck', bet, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
