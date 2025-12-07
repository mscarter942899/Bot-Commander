const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');

function flipCoin() {
    return Math.random() < 0.48 ? 'heads' : 'tails';
}

function createCoinflipEmbed(bet, choice, result = null, flipping = true) {
    const embed = new EmbedBuilder()
        .setTitle('🪙 ═══ COINFLIP ═══ 🪙')
        .setColor(PS99_COLORS.gold)
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    const choiceDisplay = choice === 'heads' ? '👑 Heads' : '🦅 Tails';
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems on **${choiceDisplay}**\n\n`;
    
    if (flipping) {
        description += `🪙 **Flipping the coin...**\n\n`;
        description += `\`\`\`\n   🪙 ↺\n\`\`\``;
    } else {
        const resultDisplay = result === 'heads' ? '👑 HEADS' : '🦅 TAILS';
        const won = choice === result;
        
        description += `**Result:** ${resultDisplay}\n\n`;
        
        if (won) {
            const winAmount = bet * 2;
            description += `🎉 **YOU WIN!**\n\nWon \`${winAmount.toLocaleString()}\` gems (2x)`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `😢 **YOU LOSE**\n\nLost \`${bet.toLocaleString()}\` gems`;
            embed.setColor(PS99_COLORS.error);
        }
    }
    
    embed.setDescription(description);
    return embed;
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`coinflip_heads_${bet}`)
            .setLabel('👑 Heads')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`coinflip_tails_${bet}`)
            .setLabel('🦅 Tails')
            .setStyle(ButtonStyle.Secondary)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin - double or nothing!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Heads or Tails')
                .setRequired(true)
                .addChoices(
                    { name: '👑 Heads', value: 'heads' },
                    { name: '🦅 Tails', value: 'tails' }
                )),
    
    async execute(interaction) {
        const settings = db.getGameSettings('coinflip');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Coinflip is currently disabled!')], ephemeral: true });
        }
        
        const bet = interaction.options.getInteger('bet');
        const choice = interaction.options.getString('choice');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (bet < settings.minBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Minimum bet is \`${settings.minBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        if (bet > settings.maxBet) {
            return interaction.reply({ embeds: [createErrorEmbed(`Maximum bet is \`${settings.maxBet.toLocaleString()}\` gems!`)], ephemeral: true });
        }
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        await interaction.reply({
            embeds: [createCoinflipEmbed(bet, choice, null, true)]
        });
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const result = flipCoin();
        const won = choice === result;
        
        if (won) {
            const winAmount = bet * 2;
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, bet, winAmount);
            db.addHouseProfit(bet - winAmount);
        } else {
            db.recordGame(interaction.user.id, false, bet, 0);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'coinflip',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            choice: choice,
            result: result,
            won: won,
            winAmount: won ? bet * 2 : 0
        });
        
        await interaction.editReply({
            embeds: [createCoinflipEmbed(bet, choice, result, false)],
            components: [createPlayAgainButton(bet)]
        });
    }
};
