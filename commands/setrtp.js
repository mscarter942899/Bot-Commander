const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');

const OWNER_ID = '1293548330319872056';

const ALL_GAMES = [
    { name: 'Slots', value: 'slots' },
    { name: 'Blackjack', value: 'blackjack' },
    { name: 'Poker', value: 'poker' },
    { name: 'High/Low', value: 'highlow' },
    { name: 'War', value: 'war' },
    { name: 'Roulette', value: 'roulette' },
    { name: 'Baccarat', value: 'baccarat' },
    { name: 'Crash', value: 'crash' },
    { name: 'Dice', value: 'dice' },
    { name: 'Mines', value: 'mines' },
    { name: 'Coinflip', value: 'coinflip' },
    { name: 'Wheel', value: 'wheel' },
    { name: 'Plinko', value: 'plinko' },
    { name: 'Lottery', value: 'lottery' },
    { name: 'Keno', value: 'keno' },
    { name: 'Scratcher', value: 'scratcher' },
    { name: 'Limbo', value: 'limbo' },
    { name: 'Tower', value: 'tower' },
    { name: 'Hi-Lo Streak', value: 'hilostreak' },
    { name: 'Double or Nothing', value: 'doubleornothing' },
    { name: 'Dragon Tiger', value: 'dragontiger' },
    { name: 'Sic Bo', value: 'sicbo' },
    { name: 'Pai Gow', value: 'paigow' },
    { name: 'Fan Tan', value: 'fantan' },
    { name: 'Chuck-a-Luck', value: 'chuckluck' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrtp')
        .setDescription('Set return-to-player rate for games (Owner only)')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set RTP for a specific game')
                .addStringOption(opt =>
                    opt.setName('game')
                        .setDescription('The game to configure')
                        .setRequired(true)
                        .addChoices(...ALL_GAMES.slice(0, 25)))
                .addNumberOption(opt =>
                    opt.setName('rtp')
                        .setDescription('RTP percentage (0.50 = 50%, 0.95 = 95%, 1.0 = 100%)')
                        .setRequired(true)
                        .setMinValue(0.01)
                        .setMaxValue(2.0)))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View all game RTP settings')),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                embeds: [createErrorEmbed('Only the bot owner can use this command!')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const game = interaction.options.getString('game');
            const rtp = interaction.options.getNumber('rtp');
            
            const settings = db.setGameRTP(game, rtp);
            
            db.addLog({
                type: 'rtp_set',
                userId: interaction.user.id,
                username: interaction.user.username,
                game: game,
                rtp: rtp
            });

            const percentDisplay = (rtp * 100).toFixed(1);
            const houseEdge = ((1 - rtp) * 100).toFixed(1);

            const embed = createPremiumEmbed({
                title: 'RTP Updated',
                titleIcon: '📊',
                color: PS99_COLORS.success,
                description: `\`\`\`\n╭─────────────────────────────╮\n│      📊 RTP CONFIGURED 📊      │\n╰─────────────────────────────╯\`\`\``,
                fields: [
                    { icon: '🎮', name: 'Game', value: `\`${game}\``, inline: true },
                    { icon: '📈', name: 'RTP', value: `\`${percentDisplay}%\``, inline: true },
                    { icon: '🏦', name: 'House Edge', value: `\`${houseEdge}%\``, inline: true }
                ],
                footer: 'Higher RTP = Players win more often'
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'view') {
            const allSettings = db.getAllGameSettings();
            
            let description = '```\n╭─────────────────────────────────╮\n│         RTP SETTINGS           │\n╰─────────────────────────────────╯```\n';
            
            for (const [game, settings] of Object.entries(allSettings)) {
                const rtp = settings.rtp || 0.95;
                const percentDisplay = (rtp * 100).toFixed(1);
                const status = settings.enabled ? '✅' : '❌';
                description += `${status} **${game}**: \`${percentDisplay}%\` RTP\n`;
            }
            
            description += '\n*RTP = Return to Player (how much players win back on average)*';

            await interaction.reply({
                embeds: [createPremiumEmbed({
                    title: 'Game RTP Settings',
                    titleIcon: '📊',
                    description: description,
                    color: PS99_COLORS.info
                })],
                ephemeral: true
            });
        }
    }
};
