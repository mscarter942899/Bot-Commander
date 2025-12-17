const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inviterewards')
        .setDescription('Configure invite rewards system (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Enable and configure invite rewards')
                .addIntegerOption(opt =>
                    opt.setName('amount')
                        .setDescription('Gems to reward per invite')
                        .setRequired(true)
                        .setMinValue(1))
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Channel to announce rewards')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('minage')
                        .setDescription('Minimum account age in days (default: 60)')
                        .setMinValue(1)
                        .setMaxValue(365)))
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable invite rewards'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current invite rewards settings')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const amount = interaction.options.getInteger('amount');
            const channel = interaction.options.getChannel('channel');
            const minAge = interaction.options.getInteger('minage') || 60;

            db.setInviteSettings({
                enabled: true,
                amount: amount,
                channelId: channel.id,
                minAccountAge: minAge
            });

            const embed = createPremiumEmbed({
                title: 'Invite Rewards Enabled!',
                titleIcon: ICONS.gift,
                color: PS99_COLORS.success,
                description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32m│[0m    [1;33m🎉 INVITE SYSTEM ACTIVE 🎉[0m    [1;32m│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\``,
                fields: [
                    { icon: ICONS.gem, name: 'Reward', value: `\`${amount.toLocaleString()}\` gems`, inline: true },
                    { icon: '📢', name: 'Channel', value: `${channel}`, inline: true },
                    { icon: ICONS.clock, name: 'Min Account Age', value: `\`${minAge}\` days`, inline: true }
                ],
                footer: 'Invite rewards will be given automatically when new members join!'
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'disable') {
            db.setInviteSettings({ enabled: false });

            await interaction.reply({
                embeds: [createSuccessEmbed('Invite Rewards Disabled', 'Invite rewards have been disabled.')]
            });

        } else if (subcommand === 'view') {
            const settings = db.getInviteSettings();

            const embed = createPremiumEmbed({
                title: 'Invite Rewards Settings',
                titleIcon: ICONS.gift,
                color: settings.enabled ? PS99_COLORS.success : PS99_COLORS.error,
                description: `\`\`\`ansi\n[1;35m╭─────────────────────────────╮[0m\n[1;35m│[0m    [1;37mINVITE CONFIGURATION[0m    [1;35m│[0m\n[1;35]╰─────────────────────────────╯[0m\`\`\``,
                fields: [
                    { icon: settings.enabled ? ICONS.check : ICONS.cross, name: 'Status', value: settings.enabled ? '`Enabled`' : '`Disabled`', inline: true },
                    { icon: ICONS.gem, name: 'Reward', value: `\`${settings.amount?.toLocaleString() || 0}\` gems`, inline: true },
                    { icon: ICONS.clock, name: 'Min Account Age', value: `\`${settings.minAccountAge || 60}\` days`, inline: true },
                    { icon: '📢', name: 'Channel', value: settings.channelId ? `<#${settings.channelId}>` : '`Not set`', inline: true }
                ],
                footer: 'Use /inviterewards setup to configure'
            });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
