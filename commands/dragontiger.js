const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

function getRandomCard() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const valueIndex = Math.floor(Math.random() * values.length);
    return { display: `${values[valueIndex]}${suit}`, value: valueIndex };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dragontiger')
        .setDescription('Bet on Dragon or Tiger!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('choice')
                .setDescription('Bet on Dragon, Tiger, or Tie')
                .setRequired(true)
                .addChoices(
                    { name: '🐉 Dragon', value: 'dragon' },
                    { name: '🐅 Tiger', value: 'tiger' },
                    { name: '🤝 Tie (8x payout)', value: 'tie' }
                )),

    async execute(interaction, client) {
        const settings = db.getGameSettings('dragontiger');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Dragon Tiger is currently disabled!')], ephemeral: true });
        }

        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const choice = interaction.options.getString('choice');
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const dealEmbed = createGameEmbed({
            game: 'dragontiger',
            title: '🐉 DRAGON TIGER 🐅',
            description: `\`\`\`\n╭─────────────────────────────╮\n│     🐉 DEALING CARDS 🐅     │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n🎯 **Your Bet:** ${choice === 'dragon' ? '🐉 Dragon' : choice === 'tiger' ? '🐅 Tiger' : '🤝 Tie'}\n\n🃏 Dealing cards...`,
            color: PS99_COLORS.gold,
            bet: bet
        });

        await interaction.reply({ embeds: [dealEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const dragonCard = getRandomCard();
        const tigerCard = getRandomCard();

        let result;
        if (dragonCard.value > tigerCard.value) result = 'dragon';
        else if (tigerCard.value > dragonCard.value) result = 'tiger';
        else result = 'tie';

        let won = false;
        let multiplier = 0;

        if (choice === result) {
            won = true;
            multiplier = choice === 'tie' ? 8 : 2;
        } else if (result === 'tie' && choice !== 'tie') {
            multiplier = 0.5;
            won = true;
        }

        const winnings = Math.floor(bet * multiplier);
        const resultDisplay = `🐉 **Dragon:** \`${dragonCard.display}\`\n🐅 **Tiger:** \`${tigerCard.display}\`\n\n🏆 **Winner:** ${result === 'dragon' ? '🐉 Dragon' : result === 'tiger' ? '🐅 Tiger' : '🤝 Tie'}`;

        if (won && winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, true, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (multiplier >= 8) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Dragon Tiger', winnings, multiplier);
            }

            const embed = createWinEmbed('Dragon Tiger', winnings, multiplier, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Dragon Tiger', bet, resultDisplay);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
