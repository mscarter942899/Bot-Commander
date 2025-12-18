const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createErrorEmbed, createSuccessEmbed } = require('../utils/embedBuilder');

const OWNER_ID = '1293548330319872056';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setadminrole')
        .setDescription('Set which role can use admin commands (Owner only)')
        .addRoleOption(opt =>
            opt.setName('role')
                .setDescription('The role that can use admin commands')
                .setRequired(false))
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set the admin role')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('The role that can use admin commands')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove the admin role restriction'))
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View the current admin role')),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({
                embeds: [createErrorEmbed('Only the bot owner can use this command!')],
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const role = interaction.options.getRole('role');
            
            db.setAdminRoleId(role.id);
            
            db.addLog({
                type: 'admin_role_set',
                userId: interaction.user.id,
                username: interaction.user.username,
                roleId: role.id,
                roleName: role.name
            });

            const embed = createPremiumEmbed({
                title: 'Admin Role Set',
                titleIcon: '🛡️',
                color: PS99_COLORS.success,
                description: `\`\`\`\n╭─────────────────────────────╮\n│     🛡️ ADMIN ROLE SET 🛡️     │\n╰─────────────────────────────╯\`\`\`\n\nThe role **${role.name}** can now use admin commands.\n\nMembers with this role will be able to:\n• Use economy commands (add/remove gems)\n• Configure game settings\n• Manage shop items\n• Configure invite rewards\n• And more!`,
                footer: 'Only you (the owner) can change this setting'
            });

            await interaction.reply({ embeds: [embed] });

        } else if (subcommand === 'remove') {
            db.setAdminRoleId(null);

            db.addLog({
                type: 'admin_role_removed',
                userId: interaction.user.id,
                username: interaction.user.username
            });

            await interaction.reply({
                embeds: [createSuccessEmbed('Admin Role Removed', 'The admin role restriction has been removed. Only server administrators and you can use admin commands now.')]
            });

        } else if (subcommand === 'view') {
            const roleId = db.getAdminRoleId();

            if (!roleId) {
                await interaction.reply({
                    embeds: [createPremiumEmbed({
                        title: 'Admin Role',
                        titleIcon: '🛡️',
                        color: PS99_COLORS.info,
                        description: 'No admin role is currently set.\n\nOnly server administrators and the bot owner can use admin commands.\n\nUse `/setadminrole set` to set an admin role.',
                        footer: 'Owner only command'
                    })],
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    embeds: [createPremiumEmbed({
                        title: 'Admin Role',
                        titleIcon: '🛡️',
                        color: PS99_COLORS.success,
                        description: `The current admin role is: <@&${roleId}>\n\nMembers with this role can use admin commands.`,
                        footer: 'Owner only command'
                    })],
                    ephemeral: true
                });
            }
        }
    }
};
