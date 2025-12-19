const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { createPremiumEmbed, PS99_COLORS, ICONS, createErrorEmbed } = require('../utils/embedBuilder');

async function getRobloxUserData(username) {
    try {
        const usersResponse = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: true
            })
        });
        
        const usersData = await usersResponse.json();
        if (!usersData.data || usersData.data.length === 0) {
            return null;
        }
        
        const userData = usersData.data[0];
        const userId = userData.id;
        
        const thumbnailsResponse = await fetch(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
        );
        
        const thumbnailsData = await thumbnailsResponse.json();
        let avatarUrl = null;
        if (thumbnailsData.data && thumbnailsData.data.length > 0) {
            avatarUrl = thumbnailsData.data[0].imageUrl;
        }
        
        return {
            id: userId,
            username: userData.name,
            displayName: userData.displayName,
            avatarUrl: avatarUrl
        };
    } catch (error) {
        console.error('Error fetching Roblox user data:', error);
        return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your Roblox account to your Discord account')
        .addStringOption(opt =>
            opt.setName('username')
                .setDescription('Your Roblox username')
                .setRequired(true)),
    
    async execute(interaction) {
        const robloxUsername = interaction.options.getString('username');
        
        await interaction.deferReply();
        
        const robloxData = await getRobloxUserData(robloxUsername);
        if (!robloxData) {
            return interaction.editReply({
                embeds: [createErrorEmbed(`Roblox user "${robloxUsername}" not found! Please check the spelling.`)]
            });
        }
        
        const embed = createPremiumEmbed({
            title: 'LINK ROBLOX ACCOUNT',
            titleIcon: ICONS.check,
            color: PS99_COLORS.success,
            description: 'Is this your Roblox account?',
            fields: [
                { icon: ICONS.gem, name: 'Username', value: `\`${robloxData.username}\``, inline: true },
                { icon: '👤', name: 'Display Name', value: `\`${robloxData.displayName}\``, inline: true },
                { icon: '🔗', name: 'Account ID', value: `\`${robloxData.id}\``, inline: false }
            ],
            footer: 'React with ✅ to confirm or ❌ to cancel'
        });
        
        if (robloxData.avatarUrl) {
            embed.setThumbnail(robloxData.avatarUrl);
        }
        
        const message = await interaction.editReply({ embeds: [embed], fetchReply: true });
        
        await message.react('✅');
        await message.react('❌');
        
        const filter = (reaction, user) => 
            (reaction.emoji.name === '✅' || reaction.emoji.name === '❌') && 
            user.id === interaction.user.id;
        
        const collector = message.createReactionCollector({ filter, time: 30000, max: 1 });
        
        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '✅') {
                db.linkRobloxAccount(interaction.user.id, robloxData);
                
                const confirmEmbed = createPremiumEmbed({
                    title: 'ACCOUNT LINKED!',
                    titleIcon: ICONS.check,
                    color: PS99_COLORS.success,
                    description: `Your Roblox account **${robloxData.username}** has been linked to your Discord account!`,
                    fields: [
                        { icon: '✅', name: 'Status', value: 'Linked & Verified', inline: true },
                        { icon: ICONS.gem, name: 'Account', value: `\`${robloxData.username}\``, inline: true }
                    ],
                    footer: 'You can now use /requestdeposit and /requestwithdraw'
                });
                
                if (robloxData.avatarUrl) {
                    confirmEmbed.setThumbnail(robloxData.avatarUrl);
                }
                
                await message.edit({ embeds: [confirmEmbed], components: [] });
            } else {
                const cancelEmbed = createPremiumEmbed({
                    title: 'CANCELLED',
                    titleIcon: '❌',
                    color: PS99_COLORS.error,
                    description: 'Account link cancelled. Please try again with the correct username.',
                    footer: 'Use /link again to try again'
                });
                
                await message.edit({ embeds: [cancelEmbed], components: [] });
            }
        });
        
        collector.on('end', (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = createPremiumEmbed({
                    title: 'TIMED OUT',
                    titleIcon: '⏰',
                    color: PS99_COLORS.error,
                    description: 'You took too long to respond. Please use /link again.',
                    footer: 'You have 30 seconds to confirm'
                });
                message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            }
        });
    }
};
