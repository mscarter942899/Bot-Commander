const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

const BET_TYPES = {
    small: { check: (dice) => { const sum = dice.reduce((a, b) => a + b); return sum >= 4 && sum <= 10 && !isTriple(dice); }, payout: 2 },
    big: { check: (dice) => { const sum = dice.reduce((a, b) => a + b); return sum >= 11 && sum <= 17 && !isTriple(dice); }, payout: 2 },
    odd: { check: (dice) => dice.reduce((a, b) => a + b) % 2 === 1 && !isTriple(dice), payout: 2 },
    even: { check: (dice) => dice.reduce((a, b) => a + b) % 2 === 0 && !isTriple(dice), payout: 2 },
    triple: { check: isTriple, payout: 30 },
    anytriple: { check: isTriple, payout: 30 }
};

function isTriple(dice) {
    return dice[0] === dice[1] && dice[1] === dice[2];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicbo')
        .setDescription('Play Sic Bo!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('type')
                .setDescription('Bet type')
                .setRequired(true)
                .addChoices(
                    { name: 'Small (4-10)', value: 'small' },
                    { name: 'Big (11-17)', value: 'big' },
                    { name: 'Odd', value: 'odd' },
                    { name: 'Even', value: 'even' },
                    { name: 'Any Triple (30x)', value: 'anytriple' }
                )),

    async execute(interaction, client) {
        const settings = db.getGameSettings('sicbo');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Sic Bo is currently disabled!')], ephemeral: true });
        }

        const bet = interaction.options.getInteger('bet');
        const betType = interaction.options.getString('type');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const rollEmbed = createGameEmbed({
            game: 'sicbo',
            title: '🎲 SIC BO 🎲',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      🎲 ROLLING... 🎲      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎯 **Type:** ${betType.toUpperCase()}\n\n🎲 Rolling the dice...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [rollEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const dice = rollDice();
        const sum = dice.reduce((a, b) => a + b);
        const betInfo = BET_TYPES[betType];
        const won = betInfo.check(dice);
        const winnings = won ? bet * betInfo.payout : 0;

        const diceDisplay = `🎲 **Dice:** ${dice.map(d => `\`${d}\``).join(' + ')} = \`${sum}\`${isTriple(dice) ? ' 🎉 TRIPLE!' : ''}`;

        if (won) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (betInfo.payout >= 30) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Sic Bo', winnings, betInfo.payout);
            }

            const embed = createWinEmbed('Sic Bo', winnings, betInfo.payout, diceDisplay);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Sic Bo', bet, diceDisplay);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
