const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed, createPremiumEmbed } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverboost')
        .setDescription('Admin events to boost activity (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('doublexp')
                .setDescription('Enable double XP/gems for a duration')
                .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(1440)))
        .addSubcommand(sub =>
            sub.setName('bonusdaily')
                .setDescription('Give everyone a bonus daily reward!')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Bonus gems').setRequired(true).setMinValue(100)))
        .addSubcommand(sub =>
            sub.setName('massadd')
                .setDescription('Add gems to all users who reacted to a message')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Gems per user').setRequired(true).setMinValue(1)))
        .addSubcommand(sub =>
            sub.setName('resetdaily')
                .setDescription('Reset daily cooldown for a user')
                .addUserOption(opt => opt.setName('user').setDescription('User to reset').setRequired(true))),

    async execute(interaction, client) {
        if (!db.canUseAdminCommands(interaction.member)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need admin permissions!')], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'doublexp') {
            const minutes = interaction.options.getInteger('minutes');
            
            const embed = new EmbedBuilder()
                .setTitle('🚀 ═══ DOUBLE GEMS ACTIVE! ═══ 🚀')
                .setColor(PS99_COLORS.rainbow)
                .setDescription(`**DOUBLE GEMS** are now active for **${minutes}** minutes!\n\nAll gambling wins will be DOUBLED!\n\n⏰ Ends <t:${Math.floor((Date.now() + minutes * 60000) / 1000)}:R>`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            client.doubleGemsUntil = Date.now() + minutes * 60000;

            setTimeout(() => {
                if (client.doubleGemsUntil && Date.now() >= client.doubleGemsUntil) {
                    client.doubleGemsUntil = null;
                    interaction.channel.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('⏰ Double Gems Ended!')
                            .setColor(PS99_COLORS.info)
                            .setDescription('The double gems event has ended. Thanks for playing!')
                            .setTimestamp()]
                    });
                }
            }, minutes * 60000);

        } else if (subcommand === 'bonusdaily') {
            const amount = interaction.options.getInteger('amount');
            const users = db.getAllUsers();
            let count = 0;

            for (const userId in users) {
                db.addBalance(userId, amount);
                count++;
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 ═══ BONUS DAILY! ═══ 🎁')
                .setColor(PS99_COLORS.success)
                .setDescription(`**${amount.toLocaleString()}** bonus gems have been given to **${count}** users!\n\nEnjoy your bonus! 🎉`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            db.addLog({
                type: 'bonus_daily',
                userId: interaction.user.id,
                username: interaction.user.username,
                amount,
                usersAffected: count
            });

        } else if (subcommand === 'massadd') {
            const amount = interaction.options.getInteger('amount');

            const embed = new EmbedBuilder()
                .setTitle('💎 ═══ GEM GIVEAWAY! ═══ 💎')
                .setColor(PS99_COLORS.gold)
                .setDescription(`React with 💎 within 60 seconds to receive **${amount.toLocaleString()}** gems!`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('💎');

            setTimeout(async () => {
                const reaction = msg.reactions.cache.get('💎');
                if (!reaction) return;

                const users = await reaction.users.fetch();
                let count = 0;

                for (const [userId, user] of users) {
                    if (user.bot) continue;
                    db.getUser(userId, user.username);
                    db.addBalance(userId, amount);
                    count++;
                }

                const endEmbed = new EmbedBuilder()
                    .setTitle('✅ ═══ GIVEAWAY ENDED! ═══ ✅')
                    .setColor(PS99_COLORS.success)
                    .setDescription(`**${count}** people received **${amount.toLocaleString()}** gems each!\n\nTotal distributed: **${(count * amount).toLocaleString()}** gems`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp();

                await msg.edit({ embeds: [endEmbed] });
            }, 60000);

        } else if (subcommand === 'resetdaily') {
            const user = interaction.options.getUser('user');
            const userData = db.getUser(user.id, user.username);
            
            userData.lastDaily = null;
            db.saveData();

            await interaction.reply({
                embeds: [createSuccessEmbed('Daily Reset', `${user}'s daily cooldown has been reset! They can claim daily again.`)]
            });

            db.addLog({
                type: 'daily_reset',
                adminId: interaction.user.id,
                adminName: interaction.user.username,
                targetId: user.id,
                targetName: user.username
            });
        }
    }
};
