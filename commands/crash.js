const { parseGemAmount } = require('../utils/numberParser');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

function generateCrashPoint() {
    const e = 2.71828;
    const houseEdge = 0.04;
    const r = Math.random();
    
    if (r < houseEdge) {
        return 1.0;
    }
    
    return Math.max(1.0, Math.floor((1 / (1 - r)) * 100) / 100);
}

function createCrashEmbed(bet, multiplier, crashed, cashedOut, winAmount = 0) {
    const embed = new EmbedBuilder()
        .setTitle('📈 ═══ CRASH ═══ 📈')
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    let description = `**Bet:** \`${bet.toLocaleString()}\` gems\n\n`;
    
    const bars = Math.min(20, Math.floor(multiplier * 4));
    const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
    
    description += `\`\`\`\n`;
    description += `Multiplier: ${multiplier.toFixed(2)}x\n`;
    description += `[${progressBar}]\n`;
    description += `\`\`\`\n\n`;
    
    if (crashed) {
        if (cashedOut) {
            description += `🎉 **CASHED OUT!**\n\nYou won \`${winAmount.toLocaleString()}\` gems at **${multiplier.toFixed(2)}x**!`;
            embed.setColor(PS99_COLORS.success);
        } else {
            description += `💥 **CRASHED!**\n\nThe rocket crashed at **${multiplier.toFixed(2)}x**!\nYou lost \`${bet.toLocaleString()}\` gems`;
            embed.setColor(PS99_COLORS.error);
        }
    } else {
        description += `🚀 **FLYING...** Cash out before it crashes!`;
        embed.setColor(PS99_COLORS.gold);
    }
    
    embed.setDescription(description);
    return embed;
}

function createCrashButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`crash_cashout_${gameId}`)
            .setLabel('💰 CASH OUT')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`crash_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Play Crash - cash out before it crashes!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet (e.g., 1000, 2.5m, 1b)')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('autocashout')
                .setDescription('Auto cash out at this multiplier (optional)')
                .setMinValue(1.1)
                .setMaxValue(100)),
    
    async execute(interaction, client) {
        const settings = db.getGameSettings('crash');
        if (!settings.enabled) {
            return interaction.reply({ embeds: [createErrorEmbed('Crash is currently disabled!')], ephemeral: true });
        }
        
        const betInput = interaction.options.getString('bet');
        const bet = parseGemAmount(betInput);
        const autoCashout = interaction.options.getNumber('autocashout') || null;
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
        
        const crashPoint = generateCrashPoint();
        const gameId = `${interaction.user.id}_${Date.now()}`;
        
        const gameState = {
            bet,
            crashPoint,
            currentMultiplier: 1.0,
            cashedOut: false,
            userId: interaction.user.id,
            username: interaction.user.username,
            autoCashout
        };
        
        client.activeGames.set(gameId, gameState);
        
        await interaction.reply({
            embeds: [createCrashEmbed(bet, 1.0, false, false)],
            components: [createCrashButtons(gameId, false)]
        });
        
        const interval = setInterval(async () => {
            const game = client.activeGames.get(gameId);
            if (!game) {
                clearInterval(interval);
                return;
            }
            
            game.currentMultiplier += 0.05 + (Math.random() * 0.1);
            game.currentMultiplier = Math.round(game.currentMultiplier * 100) / 100;
            
            if (game.autoCashout && game.currentMultiplier >= game.autoCashout && !game.cashedOut) {
                game.cashedOut = true;
                const winAmount = Math.floor(bet * game.autoCashout);
                
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, bet, winAmount);
                db.addHouseProfit(bet - winAmount);
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Crash', winAmount, game.autoCashout);
                
                db.addLog({
                    type: 'crash',
                    userId: interaction.user.id,
                    username: interaction.user.username,
                    bet: bet,
                    multiplier: game.autoCashout,
                    crashPoint: crashPoint,
                    won: true,
                    winAmount: winAmount
                });
                
                clearInterval(interval);
                client.activeGames.delete(gameId);
                
                try {
                    await interaction.editReply({
                        embeds: [createCrashEmbed(bet, game.autoCashout, true, true, winAmount)],
                        components: [createPlayAgainButton(bet)]
                    });
                } catch (e) {}
                return;
            }
            
            if (game.currentMultiplier >= crashPoint) {
                if (!game.cashedOut) {
                    db.recordGame(interaction.user.id, false, bet, 0);
                    db.addHouseProfit(bet);
                    
                    db.addLog({
                        type: 'crash',
                        userId: interaction.user.id,
                        username: interaction.user.username,
                        bet: bet,
                        multiplier: crashPoint,
                        crashPoint: crashPoint,
                        won: false,
                        winAmount: 0
                    });
                }
                
                clearInterval(interval);
                client.activeGames.delete(gameId);
                
                try {
                    await interaction.editReply({
                        embeds: [createCrashEmbed(bet, crashPoint, true, game.cashedOut, game.cashedOut ? Math.floor(bet * game.currentMultiplier) : 0)],
                        components: [createPlayAgainButton(bet)]
                    });
                } catch (e) {}
                return;
            }
            
            try {
                await interaction.editReply({
                    embeds: [createCrashEmbed(bet, game.currentMultiplier, false, false)],
                    components: [createCrashButtons(gameId, false)]
                });
            } catch (e) {
                clearInterval(interval);
                client.activeGames.delete(gameId);
            }
        }, 500);
        
        setTimeout(() => {
            clearInterval(interval);
            client.activeGames.delete(gameId);
        }, 60000);
    }
};

module.exports.createCrashEmbed = createCrashEmbed;
module.exports.createPlayAgainButton = createPlayAgainButton;
