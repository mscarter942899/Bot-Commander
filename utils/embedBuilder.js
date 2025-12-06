const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const PS99_COLORS = {
    gold: 0xFFD700,
    success: 0x00FF88,
    error: 0xFF4444,
    info: 0x00BFFF,
    purple: 0x9B59B6,
    neon: 0x39FF14,
    pink: 0xFF69B4,
    orange: 0xFF8C00
};

function createPS99Embed(options = {}) {
    const embed = new EmbedBuilder()
        .setColor(options.color || PS99_COLORS.gold)
        .setTimestamp();

    if (options.title) {
        embed.setTitle(`✨ ${options.title} ✨`);
    }
    if (options.description) {
        embed.setDescription(options.description);
    }
    if (options.fields) {
        embed.addFields(options.fields);
    }
    if (options.footer) {
        embed.setFooter({ text: `💎 ${options.footer} 💎` });
    } else {
        embed.setFooter({ text: '💎 PS99 Casino 💎' });
    }
    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }
    if (options.image) {
        embed.setImage(options.image);
    }

    return embed;
}

function createBalanceEmbed(user, balance, bank = 0) {
    return createPS99Embed({
        title: `${user.username}'s Wallet`,
        color: PS99_COLORS.gold,
        fields: [
            { name: '💰 Cash', value: `\`${balance.toLocaleString()}\` gems`, inline: true },
            { name: '🏦 Bank', value: `\`${bank.toLocaleString()}\` gems`, inline: true },
            { name: '📊 Net Worth', value: `\`${(balance + bank).toLocaleString()}\` gems`, inline: true }
        ],
        footer: 'Use /daily for free gems!'
    });
}

function createWinEmbed(game, amount, multiplier, details = '') {
    return createPS99Embed({
        title: `🎉 YOU WON! 🎉`,
        color: PS99_COLORS.success,
        description: `**Game:** ${game}\n**Won:** \`${amount.toLocaleString()}\` gems (${multiplier}x)\n${details}`,
        footer: 'Keep playing to win more!'
    });
}

function createLoseEmbed(game, amount, details = '') {
    return createPS99Embed({
        title: `😢 YOU LOST`,
        color: PS99_COLORS.error,
        description: `**Game:** ${game}\n**Lost:** \`${amount.toLocaleString()}\` gems\n${details}`,
        footer: 'Better luck next time!'
    });
}

function createErrorEmbed(message) {
    return createPS99Embed({
        title: '❌ Error',
        color: PS99_COLORS.error,
        description: message
    });
}

function createSuccessEmbed(title, message) {
    return createPS99Embed({
        title: `✅ ${title}`,
        color: PS99_COLORS.success,
        description: message
    });
}

function createProfileEmbed(user, data) {
    const winRate = data.totalGames > 0 ? ((data.wins / data.totalGames) * 100).toFixed(1) : 0;
    return createPS99Embed({
        title: `${user.username}'s Profile`,
        color: PS99_COLORS.purple,
        fields: [
            { name: '💰 Balance', value: `\`${data.balance.toLocaleString()}\` gems`, inline: true },
            { name: '🏦 Bank', value: `\`${data.bank.toLocaleString()}\` gems`, inline: true },
            { name: '📈 Net Worth', value: `\`${(data.balance + data.bank).toLocaleString()}\` gems`, inline: true },
            { name: '🎮 Games Played', value: `\`${data.totalGames.toLocaleString()}\``, inline: true },
            { name: '🏆 Wins', value: `\`${data.wins.toLocaleString()}\``, inline: true },
            { name: '📊 Win Rate', value: `\`${winRate}%\``, inline: true },
            { name: '💸 Total Wagered', value: `\`${data.totalWagered.toLocaleString()}\` gems`, inline: true },
            { name: '🎯 Total Won', value: `\`${data.totalWon.toLocaleString()}\` gems`, inline: true },
            { name: '📅 Daily Streak', value: `\`${data.dailyStreak || 0}\` days`, inline: true }
        ]
    });
}

function createLeaderboardEmbed(users, type = 'balance') {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    let description = '';
    
    users.slice(0, 10).forEach((user, index) => {
        const value = type === 'balance' ? user.balance + user.bank : user.totalWon;
        description += `${medals[index] || `${index + 1}.`} **${user.username}** - \`${value.toLocaleString()}\` gems\n`;
    });

    return createPS99Embed({
        title: type === 'balance' ? '🏆 Richest Players' : '🎰 Top Winners',
        color: PS99_COLORS.gold,
        description: description || 'No players yet!'
    });
}

module.exports = {
    PS99_COLORS,
    createPS99Embed,
    createBalanceEmbed,
    createWinEmbed,
    createLoseEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createProfileEmbed,
    createLeaderboardEmbed
};
