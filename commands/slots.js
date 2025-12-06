const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const config = require('../config.json');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍉', '⭐', '🔔', '💎', '7️⃣'];
const WEIGHTS = [20, 18, 16, 14, 12, 10, 6, 4];

function getWeightedSymbol() {
    const totalWeight = WEIGHTS.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < SYMBOLS.length; i++) {
        random -= WEIGHTS[i];
        if (random <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[0];
}

function generateReel() {
    return [getWeightedSymbol(), getWeightedSymbol(), getWeightedSymbol()];
}

function generateSpinFrame() {
    return [generateReel(), generateReel(), generateReel()];
}

function calculateWin(middleRow, bet) {
    const [s1, s2, s3] = middleRow;
    
    if (s1 === s2 && s2 === s3) {
        if (s1 === '💎') return { multiplier: 50, win: bet * 50 };
        if (s1 === '7️⃣') return { multiplier: 25, win: bet * 25 };
        if (s1 === '⭐') return { multiplier: 10, win: bet * 10 };
        if (s1 === '🔔') return { multiplier: 8, win: bet * 8 };
        if (s1 === '🍉') return { multiplier: 5, win: bet * 5 };
        if (s1 === '🍊') return { multiplier: 4, win: bet * 4 };
        if (s1 === '🍋') return { multiplier: 3, win: bet * 3 };
        if (s1 === '🍒') return { multiplier: 2, win: bet * 2 };
    }
    
    if (s1 === s2 || s2 === s3 || s1 === s3) {
        return { multiplier: 0.5, win: Math.floor(bet * 0.5) };
    }
    
    return { multiplier: 0, win: 0 };
}

function createSlotEmbed(frame, status, bet, spinning = true) {
    const border = '═'.repeat(15);
    const reelDisplay = frame.map((row, i) => {
        const rowStr = `║ ${row.join(' │ ')} ║`;
        return i === 1 ? `➤ ${rowStr} ◀` : `  ${rowStr}  `;
    }).join('\n');
    
    const embed = new EmbedBuilder()
        .setTitle('🎰 ═══ MEGA SLOTS ═══ 🎰')
        .setColor(spinning ? PS99_COLORS.gold : (status.win > 0 ? PS99_COLORS.success : PS99_COLORS.error))
        .setDescription(`\`\`\`\n╔${border}╗\n${reelDisplay}\n╚${border}╝\n\`\`\``)
        .addFields(
            { name: '💰 Bet', value: `\`${bet.toLocaleString()}\` gems`, inline: true },
            { name: spinning ? '🎰 Status' : (status.win > 0 ? '🎉 Won' : '😢 Lost'), 
              value: spinning ? 'Spinning...' : `\`${status.win.toLocaleString()}\` gems`, inline: true }
        )
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    if (!spinning && status.multiplier > 0) {
        embed.addFields({ name: '📊 Multiplier', value: `${status.multiplier}x`, inline: true });
    }
    
    return embed;
}

function createSlotButtons(bet, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`slots_spin_${bet}`)
            .setLabel('🎰 Spin Again')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`slots_double_${bet}`)
            .setLabel('💰 Double Bet')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`slots_max_${bet}`)
            .setLabel('🔥 Max Bet')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Play the slot machine!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (user.balance < bet) {
            return interaction.reply({ embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], ephemeral: true });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        const initialFrame = generateSpinFrame();
        await interaction.reply({ 
            embeds: [createSlotEmbed(initialFrame, { win: 0, multiplier: 0 }, bet, true)],
            components: [createSlotButtons(bet, true)]
        });
        
        const frames = [];
        for (let i = 0; i < 10; i++) {
            frames.push(generateSpinFrame());
        }
        
        const finalReels = [generateReel(), generateReel(), generateReel()];
        const middleRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
        const result = calculateWin(middleRow, bet);
        
        for (let i = 0; i < 8; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            let displayFrame;
            if (i < 3) {
                displayFrame = frames[i];
            } else if (i < 5) {
                displayFrame = [[finalReels[0][0], frames[i][0][1], frames[i][0][2]], 
                               [finalReels[0][1], frames[i][1][1], frames[i][1][2]],
                               [finalReels[0][2], frames[i][2][1], frames[i][2][2]]];
            } else if (i < 7) {
                displayFrame = [[finalReels[0][0], finalReels[1][0], frames[i][0][2]], 
                               [finalReels[0][1], finalReels[1][1], frames[i][1][2]],
                               [finalReels[0][2], finalReels[1][2], frames[i][2][2]]];
            } else {
                displayFrame = finalReels;
            }
            
            await interaction.editReply({ 
                embeds: [createSlotEmbed(displayFrame, { win: 0, multiplier: 0 }, bet, true)]
            });
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (result.win > 0) {
            db.addBalance(interaction.user.id, result.win);
            db.recordGame(interaction.user.id, true, bet, result.win);
            db.addHouseProfit(bet - result.win);
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'slots',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            won: result.win > 0,
            winAmount: result.win,
            multiplier: result.multiplier,
            result: middleRow.join(' ')
        });
        
        const transposedFinal = [
            [finalReels[0][0], finalReels[1][0], finalReels[2][0]],
            [finalReels[0][1], finalReels[1][1], finalReels[2][1]],
            [finalReels[0][2], finalReels[1][2], finalReels[2][2]]
        ];
        
        await interaction.editReply({ 
            embeds: [createSlotEmbed(transposedFinal, result, bet, false)],
            components: [createSlotButtons(bet, false)]
        });
    }
};
