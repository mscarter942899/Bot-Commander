const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setdepositchannel')
        .setDescription('Set channel for deposit notifications (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to send deposit notifications (leave empty to disable)')
                .addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        if (channel) {
            db.setDepositChannel(channel.id);

            const embed = createPremiumEmbed({
                title: 'Deposit Channel Set!',
                titleIcon: ICONS.bank,
                color: PS99_COLORS.success,
                description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32]│[0m    [1;33m🏦 DEPOSITS CHANNEL 🏦[0m    [1;32]│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\`\n\nAll deposits will now be announced in ${channel}!`,
                footer: 'Users can see when others deposit gems to their bank'
            });

            await interaction.reply({ embeds: [embed] });
        } else {
            db.setDepositChannel(null);
            await interaction.reply({
                embeds: [createSuccessEmbed('Deposit Channel Disabled', 'Deposit notifications have been disabled.')]
            });
        }
    }
};
