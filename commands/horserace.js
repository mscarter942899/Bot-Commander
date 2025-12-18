const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const HORSES = [
    { name: 'Thunder', emoji: '🏇', odds: 2 },
    { name: 'Lightning', emoji: '🐎', odds: 3 },
    { name: 'Storm', emoji: '🎠', odds: 4 },
    { name: 'Flash', emoji: '🦄', odds: 5 },
    { name: 'Bolt', emoji: '🐴', odds: 8 }
];

function createRaceEmbed(positions, bet, chosenHorse, finished = false, winner = null) {
    const embed = new EmbedBuilder()
        .setTitle('🏇 ═══ HORSE RACE ═══ 🏇')
        .setColor(PS99_COLORS.gold)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const track = positions.map((pos, i) => {
        const horse = HORSES[i];
        const trackLength = 20;
        const progress = Math.min(pos, trackLength);
        const spaces = '─'.repeat(progress);
        const remaining = '─'.repeat(trackLength - progress);
        const isChosen = i === chosenHorse;
        const marker = isChosen ? '▶' : ' ';
        return `${marker}${horse.emoji} ${horse.name} |${spaces}${horse.emoji}${remaining}| ${horse.odds}x`;
    }).join('\n');
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${HORSES[chosenHorse].name}** (${HORSES[chosenHorse].odds}x)\n\n`;
    description += `\`\`\`\n${track}\n\`\`\`\n`;
    
    if (finished) {
        const won = winner === chosenHorse;
        if (won) {
            const winAmount = bet * HORSES[chosenHorse].odds;
            description += `🎉 **${HORSES[winner].name} WINS!** 🎉\nYou won \`${winAmount.toLocaleString()}\` gems!`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `😢 **${HORSES[winner].name} wins.** Better luck next time!`;
            embed.setColor(PS99_COLORS.error);
        }
    } else {
        description += `🏁 **Race in progress...**`;
    }
    
    embed.setDescription(description);
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horserace')
        .setDescription('Bet on horse racing!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addIntegerOption(option =>
            option.setName('horse')
                .setDescription('Horse number (1-5)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5)),
    
    async execute(interaction, client) {
        const bet = interaction.options.getInteger('bet');
        const horseNum = interaction.options.getInteger('horse') - 1;
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        const settings = db.getGameSettings('horserace') || { enabled: true, minBet: 10, maxBet: 100000 };
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Horse Racing is disabled!')], ephemeral: true });
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
        
        const positions = [0, 0, 0, 0, 0];
        await interaction.reply({ embeds: [createRaceEmbed(positions, bet, horseNum)] });
        
        const finishLine = 20;
        let winner = null;
        
        while (winner === null) {
            await new Promise(r => setTimeout(r, 400));
            
            for (let i = 0; i < 5; i++) {
                const speed = Math.random() * (6 - HORSES[i].odds) + 1;
                positions[i] += speed;
                if (positions[i] >= finishLine && winner === null) {
                    winner = i;
                }
            }
            
            await interaction.editReply({ embeds: [createRaceEmbed(positions, bet, horseNum, winner !== null, winner)] });
        }
        
        const won = winner === horseNum;
        if (won) {
            const winAmount = bet * HORSES[horseNum].odds;
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
            sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Horse Race', winAmount, HORSES[horseNum].odds);
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'horserace',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet, horse: HORSES[horseNum].name, winner: HORSES[winner].name, won
        });
    }
};
