const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { PS99_COLORS, ICONS, createPremiumEmbed } = require('../utils/embedBuilder');

const pages = [
    {
        title: 'PS99 CASINO',
        icon: '🎰',
        description: '```\n╔═══════════════════════════════════╗\n║   WELCOME TO PS99 CASINO   ║\n║   Premium Gaming Experience   ║\n╚═══════════════════════════════════╝```\n\n**Navigate using the buttons below!**\n\n📑 **Page 1** - Home\n💰 **Page 2** - Economy Commands\n🎰 **Page 3** - Classic Games (11)\n🎲 **Page 4** - New Games (15)\n🛒 **Page 5** - Shop & Inventory\n🎟️ **Page 6** - Raffles\n🛡️ **Page 7** - Admin Commands',
        color: PS99_COLORS.gold
    },
    {
        title: 'ECONOMY COMMANDS',
        icon: '💰',
        description: '```\n╭─────────────────────────────╮\n│    💰 ECONOMY SYSTEM 💰    │\n╰─────────────────────────────╯```\n\n' +
            '💎 `/balance` - Check your gem balance\n' +
            '🎁 `/daily` - Claim daily reward + streak bonus\n' +
            '🎀 `/gift` - Gift gems to another user\n' +
            '🏦 `/deposit` - Deposit gems to bank\n' +
            '💵 `/withdraw` - Withdraw from bank\n' +
            '🏆 `/top` - View the richest players\n' +
            '📊 `/profile` - View your detailed stats\n' +
            '📧 `/invites` - Check your invite stats\n\n' +
            '**Prefix commands:** `!bal`, `!daily`, `!gift`, `!deposit`, `!withdraw`, `!top`, `!profile`',
        color: PS99_COLORS.success
    },
    {
        title: 'CLASSIC GAMBLING GAMES',
        icon: '🎰',
        description: '```\n╭─────────────────────────────╮\n│    🎲 CLASSIC GAMES 🎲    │\n╰─────────────────────────────╯```\n\n' +
            '🎰 `/slots` - Premium slot machine\n' +
            '🃏 `/blackjack` - Classic 21\n' +
            '♠️ `/poker` - Texas Hold\'em\n' +
            '📊 `/highlow` - Guess higher or lower\n' +
            '⚔️ `/war` - Card battle\n' +
            '🎡 `/roulette` - Casino roulette (2x-35x)\n' +
            '🎴 `/baccarat` - Player vs Banker\n' +
            '🚀 `/crash` - Cash out before crash!\n' +
            '🎲 `/dice` - Roll the dice\n' +
            '💣 `/mines` - Avoid the bombs\n' +
            '🪙 `/coinflip` - Double or nothing\n\n' +
            '**Prefix:** `!slots`, `!bj`, `!poker`, `!hl`, `!war`, `!roulette`, `!coinflip`, `!dice`',
        color: PS99_COLORS.purple
    },
    {
        title: 'NEW GAMBLING GAMES',
        icon: '🎲',
        description: '```\n╭─────────────────────────────╮\n│    ✨ 15 NEW GAMES ✨    │\n╰─────────────────────────────╯```\n\n' +
            '🎡 `/wheel` - Spin the prize wheel\n' +
            '📍 `/plinko` - Drop the ball\n' +
            '🎟️ `/lottery` - Pick 6 numbers\n' +
            '🔢 `/keno` - Match numbers\n' +
            '🎫 `/scratcher` - Scratch cards\n' +
            '📉 `/limbo` - Target multiplier\n' +
            '🗼 `/tower` - Climb & avoid traps\n' +
            '📊 `/hilostreak` - Build a streak\n' +
            '2️⃣ `/doubleornothing` - Risk it all\n' +
            '🐉 `/dragontiger` - Dragon vs Tiger\n' +
            '🎲 `/sicbo` - Three dice game\n' +
            '🀄 `/paigow` - Pai Gow tiles\n' +
            '⭕ `/fantan` - Count the beads\n' +
            '🎲 `/chuckluck` - Lucky dice\n' +
            '🐕 `/reddog` - Red Dog poker',
        color: PS99_COLORS.neon
    },
    {
        title: 'SHOP & INVENTORY',
        icon: '🛒',
        description: '```\n╭─────────────────────────────╮\n│    🛒 SHOP SYSTEM 🛒    │\n╰─────────────────────────────╯```\n\n' +
            '**Shop Commands:**\n' +
            '🛍️ `/shop browse` - Browse available items\n' +
            '💳 `/shop buy <id>` - Purchase an item\n\n' +
            '**Inventory Commands:**\n' +
            '📦 `/inventory view` - View your items\n' +
            '🔍 `/inventory item <#>` - Item details\n' +
            '🎁 `/inventory gift` - Gift items to others\n\n' +
            '**Prefix:** `!shop`, `!inv`',
        color: PS99_COLORS.info
    },
    {
        title: 'RAFFLE SYSTEM',
        icon: '🎟️',
        description: '```\n╭─────────────────────────────╮\n│    🎟️ RAFFLES 🎟️    │\n╰─────────────────────────────╯```\n\n' +
            '**Gem Raffles:**\n' +
            '👁️ `/raffle view` - View active raffle\n' +
            '📜 `/raffle history` - Past raffle results\n\n' +
            '**Item Raffles:**\n' +
            '👁️ `/itemraffle view` - View item raffle\n' +
            '📜 `/itemraffle history` - Past item raffles\n\n' +
            '*Buy tickets with gems for a chance to win!*',
        color: PS99_COLORS.pink
    },
    {
        title: 'ADMIN COMMANDS',
        icon: '🛡️',
        description: '```\n╭─────────────────────────────╮\n│    ⚡ ADMIN PANEL ⚡    │\n╰─────────────────────────────╯```\n\n' +
            '**Economy:**\n`/addgems` `/removegems` `/admin economy`\n\n' +
            '**Games:**\n`/admin games setbet` - Set min/max bets\n`/admin games toggle` - Enable/disable games\n`/setrtp` - Set return-to-player rates\n\n' +
            '**Settings:**\n`/setadminrole` - Set admin role (Owner only)\n`/inviterewards` - Configure invite rewards\n\n' +
            '**Fun Events:**\n`/admin fun makeitrain` - Gem giveaway\n`/admin fun guesscolor` - Color game\n`/admin fun guessnumber` - Number game\n`/admin fun trivia` - Trivia quiz\n`/admin fun mysterybox` - Mystery boxes\n\n' +
            '**Shop & Raffles:**\n`/shop add/edit/remove`\n`/raffle start/end/cancel`',
        color: PS99_COLORS.error
    }
];

function createHelpEmbed(pageIndex) {
    const page = pages[pageIndex];
    return new EmbedBuilder()
        .setTitle(`${page.icon} ${page.title} ${page.icon}`)
        .setColor(page.color)
        .setDescription(page.description)
        .setFooter({ text: `${ICONS.gem} PS99 Casino ${ICONS.gem} | Page ${pageIndex + 1}/${pages.length}` })
        .setTimestamp();
}

function createHelpButtons(pageIndex) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_first')
            .setEmoji('⏮️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === 0),
        new ButtonBuilder()
            .setCustomId('help_prev')
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === 0),
        new ButtonBuilder()
            .setCustomId('help_home')
            .setEmoji('🏠')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('help_next')
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(pageIndex === pages.length - 1),
        new ButtonBuilder()
            .setCustomId('help_last')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIndex === pages.length - 1)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all available commands'),
    
    async execute(interaction) {
        let currentPage = 0;
        
        const msg = await interaction.reply({ 
            embeds: [createHelpEmbed(currentPage)], 
            components: [createHelpButtons(currentPage)],
            fetchReply: true
        });
        
        const collector = msg.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 120000 
        });
        
        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Use `/help` to view your own help menu!', ephemeral: true });
            }
            
            if (i.customId === 'help_first') currentPage = 0;
            else if (i.customId === 'help_prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'help_home') currentPage = 0;
            else if (i.customId === 'help_next') currentPage = Math.min(pages.length - 1, currentPage + 1);
            else if (i.customId === 'help_last') currentPage = pages.length - 1;
            
            await i.update({
                embeds: [createHelpEmbed(currentPage)],
                components: [createHelpButtons(currentPage)]
            });
        });
        
        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('help_first').setEmoji('⏮️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('help_prev').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('help_home').setEmoji('🏠').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('help_next').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('help_last').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            await msg.edit({ components: [disabledRow] }).catch(() => {});
        });
    }
};
