const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('interest')
        .setDescription('Configure bank interest system (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Enable and configure bank interest')
                .addNumberOption(opt =>
                    opt.setName('rate')
                        .setDescription('Interest rate as decimal (e.g., 0.05 for 5%)')
                        .setRequired(true)
                        .setMinValue(0.001)
                        .setMaxValue(1))
                .addIntegerOption(opt =>
                    opt.setName('hours')
                        .setDescription('Hours between interest payments (default: 24)')
                        .setMinValue(1)
                        .setMaxValue(168)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable bank interest'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current interest settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const rate = interaction.options.getNumber('rate');
            const hours = interaction.options.getInteger('hours') || 24;

            db.setInterestSettings({
                enabled: true,
                rate: rate,
                intervalHours: hours
            });

            const percentRate = (rate * 100).toFixed(2);

            const embed = createPremiumEmbed({
                title: 'Bank Interest Enabled!',
                titleIcon: ICONS.bank,
                color: PS99_COLORS.success,
                description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32m│[0m    [1;33m🏦 INTEREST ACTIVE 🏦[0m    [1;32]│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\`\n\nUsers will now earn interest on gems stored in their bank!`,
                fields: [
                    { icon: '📈', name: 'Interest Rate', value: `\`${percentRate}%\``, inline: true },
                    { icon: ICONS.clock, name: 'Interval', value: `Every \`${hours}\` hours`, inline: true }
                ],
                footer: 'Interest is applied automatically to all bank balances!'
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'disable') {
            db.setInterestSettings({ enabled: false });

            await interaction.reply({
                embeds: [createSuccessEmbed('Interest Disabled', 'Bank interest has been disabled.')]
            });

        } else if (subcommand === 'view') {
            const settings = db.getInterestSettings();
            const percentRate = ((settings.rate || 0) * 100).toFixed(2);

            const embed = createPremiumEmbed({
                title: 'Interest Settings',
                titleIcon: ICONS.bank,
                color: settings.enabled ? PS99_COLORS.success : PS99_COLORS.error,
                description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35m│[0m    [1;37mINTEREST CONFIGURATION[0m    [1;35]│[0m\n[1;35]╰─────────────────────────────╯[0m\`\`\``,
                fields: [
                    { icon: settings.enabled ? ICONS.check : ICONS.cross, name: 'Status', value: settings.enabled ? '`Enabled`' : '`Disabled`', inline: true },
                    { icon: '📈', name: 'Interest Rate', value: `\`${percentRate}%\``, inline: true },
                    { icon: ICONS.clock, name: 'Interval', value: `Every \`${settings.intervalHours || 24}\` hours`, inline: true }
                ],
                footer: 'Use /interest setup to configure'
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
