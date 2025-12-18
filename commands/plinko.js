const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createGameEmbed, createWinEmbed, createLoseEmbed, createErrorEmbed, PS99_COLORS, sendBigWinNotification } = require('../utils/embedBuilder');

const PLINKO_MULTIPLIERS = {
    low: [1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2],
    medium: [2.0, 1.5, 1.0, 0.3, 1.0, 1.5, 2.0],
    high: [5.0, 2.0, 1.0, 0, 1.0, 2.0, 5.0]
};

function playPlinko(risk, rtp) {
    const multipliers = PLINKO_MULTIPLIERS[risk] || PLINKO_MULTIPLIERS.medium;
    const weights = multipliers.map((m, i) => {
        const centerDistance = Math.abs(i - Math.floor(multipliers.length / 2));
        let weight = Math.pow(0.5, centerDistance) * 100;
        if (m === 0) weight *= (1.5 - rtp);
        else if (m > 1) weight *= rtp;
        return weight;
    });
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return { index: i, multiplier: multipliers[i] };
    }
    return { index: 3, multiplier: multipliers[3] };
}

function createPlinkoBoard(landingIndex) {
    const rows = ['   ⚪', '  ⚪ ⚪', ' ⚪ ⚪ ⚪', '⚪ ⚪ ⚪ ⚪'];
    const slots = ['5x', '2x', '1x', '0x', '1x', '2x', '5x'];
    const markedSlots = slots.map((s, i) => i === landingIndex ? `[${s}]` : ` ${s} `);
    return rows.join('\n') + '\n' + markedSlots.join('');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('plinko')
        .setDescription('Drop a ball in Plinko!')
        .addIntegerOption(opt =>
            opt.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(opt =>
            opt.setName('risk')
                .setDescription('Risk level')
                .setRequired(false)
                .addChoices(
                    { name: 'Low', value: 'low' },
                    { name: 'Medium', value: 'medium' },
                    { name: 'High', value: 'high' }
                )),

    async execute(interaction, client) {
        const settings = db.getGameSettings('plinko');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Plinko is currently disabled!')], ephemeral: true });
        }

        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const risk = interaction.options.getString('risk') || 'medium';
        
        if (bet < settings.minBet || bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Bet must be between ${settings.minBet.toLocaleString()} and ${settings.maxBet.toLocaleString()} gems!`)], ephemeral: true });
        }

        const user = db.getUser(interaction.user.id, interaction.user.username);
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed('Insufficient balance!')], ephemeral: true });
        }

        db.removeBalance(interaction.user.id, bet);

        const dropEmbed = createGameEmbed({
            game: 'plinko',
            title: '📍 PLINKO 📍',
            description: `\`\`\`\n╭─────────────────────────────╮\n│      📍 DROPPING... 📍      │\n╰─────────────────────────────╯\`\`\`\n\n💎 **Bet:** \`${bet.toLocaleString()}\` gems\n⚠️ **Risk:** ${risk.toUpperCase()}\n\n🔵 The ball is bouncing down...`,
            color: PS99_COLORS.purple,
            bet: bet
        });

        await interaction.reply({ embeds: [dropEmbed] });
        await new Promise(resolve => setTimeout(resolve, 1500));

        const rtp = settings.rtp || 0.94;
        const result = playPlinko(risk, rtp);
        const winnings = Math.floor(bet * result.multiplier);

        const board = createPlinkoBoard(result.index);

        if (winnings > 0) {
            db.addBalance(interaction.user.id, winnings);
            db.recordGame(interaction.user.id, result.multiplier >= 1, bet, winnings);
            db.addHouseProfit(bet - winnings);

            if (result.multiplier >= 5) {
                await sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Plinko', winnings, result.multiplier);
            }

            const embed = createWinEmbed('Plinko', winnings, result.multiplier, 
                `\`\`\`\n${board}\n\`\`\`\n📍 The ball landed on **${result.multiplier}x**!`);
            await interaction.editReply({ embeds: [embed] });
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);

            const embed = createLoseEmbed('Plinko', bet, 
                `\`\`\`\n${board}\n\`\`\`\n💀 The ball fell in the **0x** slot!`);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
