const db = require('../database/db');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PS99_COLORS, createErrorEmbed, sendBigWinNotification } = require('../utils/embedBuilder');

const MULTIPLIERS = [1.5, 2, 3, 5, 10];

module.exports = {
    customId: 'rr',
    async execute(interaction, client) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const game = client.activeGames?.get(`rr_${interaction.user.id}`);
        
        if (!game) {
            return interaction.reply({ embeds: [createErrorEmbed('Game expired! Start a new game.')], ephemeral: true });
        }
        
        if (action === 'pull') {
            if (game.currentChamber === game.bulletPosition) {
                const embed = new EmbedBuilder()
                    .setTitle('🔫 ═══ RUSSIAN ROULETTE ═══ 🔫')
                    .setColor(PS99_COLORS.error)
                    .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n💥 **BANG!** 💥\n\nYou hit the bullet!\nLost: \`${game.bet.toLocaleString()}\` gems`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp();
                
                db.recordGame(interaction.user.id, false, game.bet);
                db.addHouseProfit(game.bet);
                client.activeGames.delete(`rr_${interaction.user.id}`);
                
                return interaction.update({ embeds: [embed], components: [] });
            }
            
            game.survived++;
            game.currentChamber++;
            
            if (game.survived >= 5) {
                const winAmount = Math.floor(game.bet * MULTIPLIERS[4]);
                
                const embed = new EmbedBuilder()
                    .setTitle('🔫 ═══ RUSSIAN ROULETTE ═══ 🔫')
                    .setColor(PS99_COLORS.rainbow)
                    .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n🎉 **PERFECT SURVIVOR!** 🎉\n\n5/5 pulls survived!\nWon: \`${winAmount.toLocaleString()}\` gems (10x)`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp();
                
                db.addBalance(interaction.user.id, winAmount);
                db.recordGame(interaction.user.id, true, game.bet, winAmount);
                db.addHouseProfit(game.bet - winAmount);
                sendBigWinNotification(client, interaction.user.id, interaction.user.username, 'Russian Roulette', winAmount, 10);
                client.activeGames.delete(`rr_${interaction.user.id}`);
                
                return interaction.update({ embeds: [embed], components: [] });
            }
            
            const nextMult = MULTIPLIERS[game.survived];
            const gameId = Date.now().toString();
            
            const embed = new EmbedBuilder()
                .setTitle('🔫 ═══ RUSSIAN ROULETTE ═══ 🔫')
                .setColor(PS99_COLORS.success)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n*click* ... **SAFE!** ✅\n\n**Survived:** ${game.survived}/5\n**Current Multiplier:** \`${nextMult}x\`\n**Potential Win:** \`${Math.floor(game.bet * nextMult).toLocaleString()}\` gems`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_pull_${gameId}`)
                    .setLabel('🔫 Pull Again')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`rr_cashout_${gameId}`)
                    .setLabel(`💰 Cash Out (${MULTIPLIERS[game.survived - 1]}x)`)
                    .setStyle(ButtonStyle.Success)
            );
            
            await interaction.update({ embeds: [embed], components: [buttons] });
            
        } else if (action === 'cashout') {
            const multiplier = MULTIPLIERS[game.survived - 1];
            const winAmount = Math.floor(game.bet * multiplier);
            
            const embed = new EmbedBuilder()
                .setTitle('🔫 ═══ RUSSIAN ROULETTE ═══ 🔫')
                .setColor(PS99_COLORS.success)
                .setDescription(`**Bet:** \`${game.bet.toLocaleString()}\` gems\n\n💰 **CASHED OUT!** 💰\n\nSurvived ${game.survived} pulls\nWon: \`${winAmount.toLocaleString()}\` gems (${multiplier}x)`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();
            
            db.addBalance(interaction.user.id, winAmount);
            db.recordGame(interaction.user.id, true, game.bet, winAmount);
            db.addHouseProfit(game.bet - winAmount);
            client.activeGames.delete(`rr_${interaction.user.id}`);
            
            await interaction.update({ embeds: [embed], components: [] });
        }
    }
};
