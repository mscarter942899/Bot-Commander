const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍌'];
const WEIGHTS = [20, 18, 16, 14, 12, 10, 6, 4];

function getSymbol() {
    const total = WEIGHTS.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < FRUITS.length; i++) {
        rand -= WEIGHTS[i];
        if (rand <= 0) return FRUITS[i];
    }
    return FRUITS[0];
}

function spin() {
    return [getSymbol(), getSymbol(), getSymbol(), getSymbol(), getSymbol()];
}

function calculateWin(row, bet) {
    let maxWin = 0;
    
    for (let i = 0; i <= 2; i++) {
        const segment = row.slice(i, i + 3);
        if (segment[0] === segment[1] && segment[1] === segment[2]) {
            const idx = FRUITS.indexOf(segment[0]);
            const mult = [2, 3, 4, 5, 8, 10, 15, 25][idx];
            maxWin = Math.max(maxWin, mult);
        }
    }
    
    const allSame = row.every(s => s === row[0]);
    if (allSame) {
        const idx = FRUITS.indexOf(row[0]);
        maxWin = [10, 15, 20, 30, 50, 75, 100, 200][idx];
    }
    
    return maxWin * bet;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fruitslots')
        .setDescription('5-reel fruit slots!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true)),
    
    async execute(interaction, client) {
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('fruitslots') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Fruit Slots is disabled!')], ephemeral: true });
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
            .setTitle('🍒 ═══ FRUIT SLOTS ═══ 🍒')
            .setColor(PS99_COLORS.gold)
            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n\`\`\`\n[ ? | ? | ? | ? | ? ]\n\`\`\`\n\n⏳ Spinning...`)
            .setFooter({ text: '💎 PS99 Casino 💎' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
        for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 400));
            const partial = spin();
            embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n\`\`\`\n[ ${partial.join(' | ')} ]\n\`\`\`\n\n⏳ Spinning...`);
            await interaction.editReply({ embeds: [embed] });
        }
        
        await new Promise(r => setTimeout(r, 300));
        
        const result = spin();
        const winAmount = calculateWin(result, bet);
        
        embed.setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n\`\`\`\n[ ${result.join(' | ')} ]\n\`\`\`\n\n${winAmount > 0 ? `🎉 **YOU WON \`${winAmount.toLocaleString()}\` gems!**` : `😢 No match. Lost \`${bet.toLocaleString()}\` gems`}`);
        embed.setColor(winAmount > 0 ? PS99_COLORS.success : PS99_COLORS.error);
        
        if (winAmount > 0) {
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Fruit Slots', winAmount, winAmount / bet);
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({ type: 'fruitslots', userId: interaction.user.id, username: interaction.user.username, bet, result: result.join(''), winAmount, won: winAmount > 0 });
        
        await interaction.editReply({ embeds: [embed] });
    }
};
