const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bigwins')
        .setDescription('Configure big wins channel notifications (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Enable and configure big wins notifications')
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel to announce big wins')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('threshold')
                        .setDescription('Minimum win amount to announce (default: 10000)')
                        .setMinValue(100)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable big wins notifications'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current big wins settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const threshold = interaction.options.getInteger('threshold') || 10000;

            db.setBigWinsSettings({
                enabled: true,
                channelId: channel.id,
                threshold: threshold
            });

            const embed = createPremiumEmbed({
                title: 'Big Wins Channel Set!',
                titleIcon: ICONS.trophy,
                color: PS99_COLORS.success,
                description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32m│[0m    [1;33m🏆 BIG WINS ACTIVE 🏆[0m    [1;32]│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\`\n\nBig wins will now be announced in ${channel}!`,
                fields: [
                    { icon: '📢', name: 'Channel', value: `${channel}`, inline: true },
                    { icon: ICONS.gem, name: 'Threshold', value: `\`${threshold.toLocaleString()}\` gems`, inline: true }
                ],
                footer: 'Wins above the threshold will be automatically announced!'
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'disable') {
            db.setBigWinsSettings({ enabled: false });

            await interaction.reply({
                embeds: [createSuccessEmbed('Big Wins Disabled', 'Big wins notifications have been disabled.')]
            });

        } else if (subcommand === 'view') {
            const settings = db.getBigWinsSettings();

            const embed = createPremiumEmbed({
                title: 'Big Wins Settings',
                titleIcon: ICONS.trophy,
                color: settings.enabled ? PS99_COLORS.success : PS99_COLORS.error,
                description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35]│[0m    [1;37mBIG WINS CONFIGURATION[0m    [1;35]│[0m\n[1;35]╰─────────────────────────────╯[0m\`\`\``,
                fields: [
                    { icon: settings.enabled ? ICONS.check : ICONS.cross, name: 'Status', value: settings.enabled ? '`Enabled`' : '`Disabled`', inline: true },
                    { icon: '📢', name: 'Channel', value: settings.channelId ? `<#${settings.channelId}>` : '`Not set`', inline: true },
                    { icon: ICONS.gem, name: 'Threshold', value: `\`${(settings.threshold || 10000).toLocaleString()}\` gems`, inline: true }
                ],
                footer: 'Use /bigwins setup to configure'
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
