const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function createPlayAgainButton(bet) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`crash_again_${bet}`)
            .setLabel('🔄 Play Again')
            .setStyle(ButtonStyle.Success)
    );
}

function generateCrashPoint() {
    const houseEdge = 0.04;
    const r = Math.random();
    if (r < houseEdge) return 1.0;
    return Math.max(1.0, Math.floor((1 / (1 - r)) * 100) / 100);
}

module.exports = {
    customId: 'crash',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
        if (action === 'cashout') {
            const gameId = parts.slice(2).join('_');
            const game = client.activeGames.get(gameId);
            
            if (!game) {
                return interaction.reply({ embeds: [createErrorEmbed('Game not found!')], ephemeral: true });
            }
            
            if (game.userId !== interaction.user.id) {
                return interaction.reply({ embeds: [createErrorEmbed('This is not your game!')], ephemeral: true });
            }
            
            if (game.cashedOut) {
                return interaction.reply({ embeds: [createErrorEmbed('You already cashed out!')], ephemeral: true });
            }
            
            game.cashedOut = true;
            const winAmount = Math.floor(game.bet * game.currentMultiplier);
            
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
            db.addHouseProfit(game.bet - winAmount);
            sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Crash', winAmount, game.currentMultiplier);
            
            db.addLog({
                type: 'crash',
                userId: interaction.user.id,
                username: interaction.user.username,
                bet: game.bet,
                multiplier: game.currentMultiplier,
                crashPoint: game.crashPoint,
                won: true,
                winAmount: winAmount
            });
            
            const embed = new EmbedBuilder()
                .setTitle('📈 ═══ CRASH ═══ 📈')
                .setColor(PS99_COLORS.success)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n🎉 **CASHED OUT!**\n\nYou won \`${winAmount.toLocaleString()}\` gems at **${game.currentMultiplier.toFixed(2)}x**!`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            client.activeGames.delete(gameId);
            
            await interaction.update({
                embeds: [embed],
                components: [createPlayAgainButton(game.bet)]
            });
            
        } else if (action === 'again') {
            const bet = parseInt(parts[2]);
            const settings = db.getGameSettings('crash');
            
            if (!settings.enabled) {
                return interaction.reply({ embeds: [createErrorEmbed('Crash is currently disabled!')], ephemeral: true });
            }
            
            const user = db.getUser(interaction.user.id, interaction.user.username);
            
            if (user.balance < bet) {
                return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems!`)], ephemeral: true });
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
                username: interaction.user.username
            };
            
            client.activeGames.set(gameId, gameState);
            
            const cashoutButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`crash_cashout_${gameId}`)
                    .setLabel('💰 CASH OUT')
                    .setStyle(ButtonStyle.Success)
            );
            
            await interaction.update({
                embeds: [new EmbedBuilder()
                    .setTitle('📈 ═══ CRASH ═══ 📈')
                    .setColor(PS99_COLORS.gold)
                    .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n🚀 **FLYING...** Cash out before it crashes!`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp()
                ],
                components: [cashoutButton]
            });
            
            const interval = setInterval(async () => {
                const game = client.activeGames.get(gameId);
                if (!game) {
                    clearInterval(interval);
                    return;
                }
                
                game.currentMultiplier += 0.05 + (Math.random() * 0.1);
                game.currentMultiplier = Math.round(game.currentMultiplier * 100) / 100;
                
                if (game.currentMultiplier >= crashPoint) {
                    if (!game.cashedOut) {
                        db.recordGame(interaction.user.id, false, bet, 0);
                        db.addHouseProfit(bet);
                    }
                    
                    clearInterval(interval);
                    client.activeGames.delete(gameId);
                    
                    try {
                        await interaction.editReply({
                            embeds: [new EmbedBuilder()
                                .setTitle('📈 ═══ CRASH ═══ 📈')
                                .setColor(PS99_COLORS.error)
                                .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n💥 **CRASHED!** at **${crashPoint.toFixed(2)}x**\n\nLost \`${bet.toLocaleString()}\` gems`)
                                .setFooter({ text: '💎 PS99 Casino 💎' })
                                .setTimestamp()
                            ],
                            components: [createPlayAgainButton(bet)]
                        });
                    } catch (e) {}
                    return;
                }
                
                try {
                    await interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setTitle('📈 ═══ CRASH ═══ 📈')
                            .setColor(PS99_COLORS.gold)
                            .setDescription(`**Bet:** \`${bet.toLocaleString()}\` gems\n\n**Multiplier:** ${game.currentMultiplier.toFixed(2)}x\n\n🚀 **FLYING...** Cash out before it crashes!`)
                            .setFooter({ text: '💎 PS99 Casino 💎' })
                            .setTimestamp()
                        ]
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
    }
};
