const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createSuccessEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setwithdrawchannel')
        .setDescription('Set channel for withdraw notifications (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to send withdraw notifications (leave empty to disable)')
                .addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        if (channel) {
            db.setWithdrawChannel(channel.id);

            const embed = createPremiumEmbed({
                title: 'Withdraw Channel Set!',
                titleIcon: ICONS.money,
                color: PS99_COLORS.success,
                description: `\`\`\`ansi\n[1;32m╭─────────────────────────────╮[0m\n[1;32]│[0m    [1;33m💵 WITHDRAWS CHANNEL 💵[0m    [1;32]│[0m\n[1;32]╰─────────────────────────────╯[0m\`\`\`\n\nAll withdrawals will now be announced in ${channel}!`,
                footer: 'Users can see when others withdraw gems from their bank'
            });

            await interaction.reply({ embeds: [embed] });
        } else {
            db.setWithdrawChannel(null);
            await interaction.reply({
                embeds: [createSuccessEmbed('Withdraw Channel Disabled', 'Withdraw notifications have been disabled.')]
            });
        }
    }
};
