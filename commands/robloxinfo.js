const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('robloxinfo')
        .setDescription('View a user\'s linked Roblox account (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('The Discord user to check')
                .setRequired(true)),
    
    async execute(interaction) {
        if (!db.canUseAdminCommands(interaction.member)) {
            return interaction.reply({ embeds: [createErrorEmbed('You do not have permission to use this command!')], ephemeral: true });
        }
        
        const targetUser = interaction.options.getUser('user');
        const userData = db.getUser(targetUser.id, targetUser.username);
        const robloxAccount = db.getRobloxAccount(targetUser.id);
        
        if (!robloxAccount) {
            return interaction.reply({
                embeds: [createErrorEmbed(`${targetUser.username} has not linked a Roblox account yet.`)],
                ephemeral: true
            });
        }
        
        const embed = createPremiumEmbed({
            title: 'ROBLOX ACCOUNT INFO',
            titleIcon: ICONS.gem,
            color: PS99_COLORS.success,
            description: `**Discord User:** <@${targetUser.id}>\n**Discord Username:** ${targetUser.username}`,
            fields: [
                { icon: '👤', name: 'Roblox Username', value: `\`${robloxAccount.username}\``, inline: true },
                { icon: '✏️', name: 'Display Name', value: `\`${robloxAccount.displayName}\``, inline: true },
                { icon: '🔗', name: 'Roblox ID', value: `\`${robloxAccount.id}\``, inline: true },
                { icon: ICONS.gem, name: 'Discord Balance', value: `\`${userData.balance.toLocaleString()}\` gems`, inline: true },
                { icon: ICONS.bank, name: 'Discord Bank', value: `\`${userData.bank.toLocaleString()}\` gems`, inline: true },
                { icon: '📊', name: 'Account Linked', value: `<t:${Math.floor(userData.createdAt / 1000)}:R>`, inline: true }
            ]
        });
        
        if (robloxAccount.avatarUrl) {
            embed.setThumbnail(robloxAccount.avatarUrl);
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};
