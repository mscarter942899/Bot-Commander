
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../database/db');
const { createPS99Embed, PS99_COLORS, createErrorEmbed } = require('../utils/embedBuilder');
const { createCanvas, loadImage } = require('canvas');

const WHEEL_SEGMENTS = [
    { multiplier: 0, label: '❌', color: '#FF4444', weight: 15 },
    { multiplier: 0.5, label: '0.5x', color: '#FF8844', weight: 20 },
    { multiplier: 1, label: '1x', color: '#FFD700', weight: 25 },
    { multiplier: 2, label: '2x', color: '#00FF88', weight: 20 },
    { multiplier: 3, label: '3x', color: '#00BFFF', weight: 10 },
    { multiplier: 5, label: '5x', color: '#9B59B6', weight: 6 },
    { multiplier: 10, label: '10x', color: '#FF69B4', weight: 3 },
    { multiplier: 50, label: '💎 50x', color: '#39FF14', weight: 1 }
];

function getWeightedSegment(betTier) {
    let segments = [...WHEEL_SEGMENTS];
    
    if (betTier === 'low') {
        segments = segments.map(s => {
            if (s.multiplier >= 10) return { ...s, weight: s.weight * 0.5 };
            if (s.multiplier === 0) return { ...s, weight: s.weight * 1.5 };
            return s;
        });
    } else if (betTier === 'high') {
        segments = segments.map(s => {
            if (s.multiplier >= 3) return { ...s, weight: s.weight * 1.5 };
            if (s.multiplier === 0) return { ...s, weight: s.weight * 0.7 };
            return s;
        });
    }
    
    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const segment of segments) {
        random -= segment.weight;
        if (random <= 0) return segment;
    }
    
    return segments[0];
}

function getBetTier(bet) {
    if (bet < 100) return 'low';
    if (bet < 1000) return 'medium';
    return 'high';
}

async function generateWheelGif(winningSegment, frames = 30) {
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d');
    const centerX = 300;
    const centerY = 300;
    const radius = 250;
    
    const winningIndex = WHEEL_SEGMENTS.findIndex(s => s.multiplier === winningSegment.multiplier && s.label === winningSegment.label);
    const segmentAngle = (Math.PI * 2) / WHEEL_SEGMENTS.length;
    const targetRotation = (winningIndex * segmentAngle) + (segmentAngle / 2) + (Math.PI * 8);
    
    const buffers = [];
    
    for (let frame = 0; frame < frames; frame++) {
        const progress = frame / (frames - 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const rotation = targetRotation * easeProgress;
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 600, 600);
        
        for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
            const startAngle = (i * segmentAngle) - rotation;
            const endAngle = startAngle + segmentAngle;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = WHEEL_SEGMENTS[i].color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            const textAngle = startAngle + segmentAngle / 2;
            const textX = centerX + Math.cos(textAngle) * (radius * 0.7);
            const textY = centerY + Math.sin(textAngle) * (radius * 0.7);
            
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(WHEEL_SEGMENTS[i].label, 0, 0);
            ctx.restore();
        }
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - radius - 30);
        ctx.lineTo(centerX - 15, centerY - radius - 10);
        ctx.lineTo(centerX + 15, centerY - radius - 10);
        ctx.closePath();
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.strokeText('🎰 SPIN THE WHEEL 🎰', centerX, 50);
        ctx.fillText('🎰 SPIN THE WHEEL 🎰', centerX, 50);
        
        buffers.push(canvas.toBuffer('image/png'));
    }
    
    return buffers[buffers.length - 1];
}

function createWheelEmbed(bet, result, prize, spinning = false) {
    const betTier = getBetTier(bet);
    let tierEmoji = '💎';
    if (betTier === 'low') tierEmoji = '🔹';
    if (betTier === 'medium') tierEmoji = '💠';
    
    const embed = new EmbedBuilder()
        .setTitle('🎰 ═══ FORTUNE WHEEL ═══ 🎰')
        .setColor(spinning ? PS99_COLORS.gold : (result.multiplier > 1 ? PS99_COLORS.success : (result.multiplier === 0 ? PS99_COLORS.error : PS99_COLORS.info)))
        .setFooter({ text: '💎 PS99 Casino 💎' })
        .setTimestamp();
    
    if (spinning) {
        embed.setDescription('🎡 **The wheel is spinning...**\n\n✨ Good luck! ✨');
        embed.addFields(
            { name: '💰 Bet', value: `\`${bet.toLocaleString()}\` gems`, inline: true },
            { name: '🎯 Bet Tier', value: `${tierEmoji} ${betTier.toUpperCase()}`, inline: true },
            { name: '⏳ Status', value: 'Spinning...', inline: true }
        );
    } else {
        let statusText = '';
        if (result.multiplier === 0) {
            statusText = '❌ **YOU LOST!**\n\nBetter luck next time!';
        } else if (result.multiplier < 1) {
            statusText = `📉 **Partial Return**\n\nYou got some gems back!`;
        } else if (result.multiplier === 1) {
            statusText = `🔄 **Break Even**\n\nYour bet was returned!`;
        } else if (result.multiplier >= 10) {
            statusText = `🎉💎 **JACKPOT! MEGA WIN!** 💎🎉\n\n${result.label} MULTIPLIER!`;
        } else {
            statusText = `🎊 **YOU WON!**\n\n${result.label} multiplier!`;
        }
        
        embed.setDescription(statusText);
        embed.addFields(
            { name: '💰 Bet', value: `\`${bet.toLocaleString()}\` gems`, inline: true },
            { name: '🎯 Landed On', value: result.label, inline: true },
            { name: result.multiplier > 0 ? '🎁 Won' : '😢 Lost', value: `\`${prize.toLocaleString()}\` gems`, inline: true }
        );
    }
    
    return embed;
}

function createWheelButtons(bet, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`wheel_spin_${bet}`)
            .setLabel('🎰 Spin Again')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`wheel_double_${bet}`)
            .setLabel('💰 Double Bet')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`wheel_max_${bet}`)
            .setLabel('🔥 Max Bet')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('wheel_info')
            .setLabel('📊 Multipliers')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wheel')
        .setDescription('Spin the fortune wheel!')
        .addIntegerOption(option =>
            option.setName('bet')
                .setDescription('Amount to bet')
                .setRequired(true)
                .setMinValue(10)),
    
    async execute(interaction) {
        const bet = interaction.options.getInteger('bet');
        const user = db.getUser(interaction.user.id, interaction.user.username);
        
        if (user.balance < bet) {
            return interaction.reply({ 
                embeds: [createErrorEmbed(`You don't have enough gems! You have \`${user.balance.toLocaleString()}\` gems.`)], 
                ephemeral: true 
            });
        }
        
        db.removeBalance(interaction.user.id, bet);
        
        await interaction.reply({ 
            embeds: [createWheelEmbed(bet, {}, 0, true)],
            components: [createWheelButtons(bet, true)]
        });
        
        const betTier = getBetTier(bet);
        const winningSegment = getWeightedSegment(betTier);
        
        const wheelImage = await generateWheelGif(winningSegment, 30);
        const attachment = new AttachmentBuilder(wheelImage, { name: 'wheel.png' });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await interaction.editReply({ 
            files: [attachment],
            embeds: [createWheelEmbed(bet, winningSegment, 0, true)],
            components: [createWheelButtons(bet, true)]
        });
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const prize = Math.floor(bet * winningSegment.multiplier);
        
        if (prize > 0) {
            db.addBalance(interaction.user.id, prize);
            db.recordGame(interaction.user.id, true, bet, prize);
            db.addHouseProfit(bet - prize);
        } else {
            db.recordGame(interaction.user.id, false, bet);
            db.addHouseProfit(bet);
        }
        
        db.addLog({
            type: 'wheel',
            userId: interaction.user.id,
            username: interaction.user.username,
            bet: bet,
            won: prize > 0,
            winAmount: prize,
            multiplier: winningSegment.multiplier,
            result: winningSegment.label
        });
        
        await interaction.editReply({ 
            embeds: [createWheelEmbed(bet, winningSegment, prize, false)],
            components: [createWheelButtons(bet, false)]
        });
    }
};
