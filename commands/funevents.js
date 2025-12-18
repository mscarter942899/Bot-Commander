const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { PS99_COLORS, createErrorEmbed, createSuccessEmbed, createPremiumEmbed, ICONS } = require('../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('funevent')
        .setDescription('Start fun community events (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('gemrain')
                .setDescription('Drop gems for everyone who reacts!')
                .addIntegerOption(opt => opt.setName('amount').setDescription('Total gems to distribute').setRequired(true).setMinValue(100))
                .addIntegerOption(opt => opt.setName('duration').setDescription('Seconds to react (default 30)').setMinValue(5).setMaxValue(120)))
        .addSubcommand(sub =>
            sub.setName('luckydraw')
                .setDescription('Random user wins gems!')
                .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount').setRequired(true).setMinValue(100))
                .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(10)))
        .addSubcommand(sub =>
            sub.setName('quiz')
                .setDescription('Start a trivia quiz!')
                .addStringOption(opt => opt.setName('question').setDescription('The question').setRequired(true))
                .addStringOption(opt => opt.setName('answer').setDescription('Correct answer').setRequired(true))
                .addIntegerOption(opt => opt.setName('prize').setDescription('Prize for first correct answer').setRequired(true).setMinValue(100)))
        .addSubcommand(sub =>
            sub.setName('scramble')
                .setDescription('Word scramble game!')
                .addStringOption(opt => opt.setName('word').setDescription('Word to scramble').setRequired(true))
                .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount').setRequired(true).setMinValue(100)))
        .addSubcommand(sub =>
            sub.setName('mathrace')
                .setDescription('First to solve wins!')
                .addIntegerOption(opt => opt.setName('prize').setDescription('Prize amount').setRequired(true).setMinValue(100))),

    async execute(interaction, client) {
        if (!db.canUseAdminCommands(interaction.member)) {
            return interaction.reply({ embeds: [createErrorEmbed('You need admin permissions!')], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'gemrain') {
            const amount = interaction.options.getInteger('amount');
            const duration = interaction.options.getInteger('duration') || 30;
            
            const embed = new EmbedBuilder()
                .setTitle('💎 ═══ GEM RAIN! ═══ 💎')
                .setColor(PS99_COLORS.rainbow)
                .setDescription(`**${amount.toLocaleString()}** gems are falling from the sky!\n\nClick the button below to catch gems!\n\n⏰ Time remaining: **${duration}** seconds`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('gemrain_catch')
                    .setLabel('💎 Catch Gems!')
                    .setStyle(ButtonStyle.Success)
            );

            const msg = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });
            
            const collectors = new Set();
            const collector = msg.createMessageComponentCollector({ time: duration * 1000 });

            collector.on('collect', async i => {
                if (collectors.has(i.user.id)) {
                    return i.reply({ content: 'You already caught gems!', ephemeral: true });
                }
                collectors.add(i.user.id);
                await i.reply({ content: '💎 You\'re in the gem rain!', ephemeral: true });
            });

            collector.on('end', async () => {
                if (collectors.size === 0) {
                    embed.setDescription('😢 No one caught the gems!');
                    return msg.edit({ embeds: [embed], components: [] });
                }

                const perPerson = Math.floor(amount / collectors.size);
                const winners = [];
                
                for (const userId of collectors) {
                    db.getUser(userId);
                    db.addBalance(userId, perPerson);
                    winners.push(`<@${userId}>`);
                }

                embed.setDescription(`🎉 **GEM RAIN ENDED!**\n\n**${collectors.size}** people caught gems!\nEach person received **${perPerson.toLocaleString()}** gems!\n\n**Catchers:** ${winners.slice(0, 20).join(', ')}${winners.length > 20 ? ` and ${winners.length - 20} more!` : ''}`);
                embed.setColor(PS99_COLORS.success);
                
                await msg.edit({ embeds: [embed], components: [] });
            });

        } else if (subcommand === 'luckydraw') {
            const prize = interaction.options.getInteger('prize');
            const winnersCount = interaction.options.getInteger('winners') || 1;

            const embed = new EmbedBuilder()
                .setTitle('🎰 ═══ LUCKY DRAW! ═══ 🎰')
                .setColor(PS99_COLORS.gold)
                .setDescription(`**${prize.toLocaleString()}** gems up for grabs!\n\n**${winnersCount}** lucky winner(s) will be chosen!\n\nClick to enter! ⏰ 30 seconds`)
                .setFooter({ text: '💎 PS99 Casino 💎' })
                .setTimestamp();

            const button = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('luckydraw_enter')
                    .setLabel('🎰 Enter Draw!')
                    .setStyle(ButtonStyle.Primary)
            );

            const msg = await interaction.reply({ embeds: [embed], components: [button], fetchReply: true });
            
            const entries = new Set();
            const collector = msg.createMessageComponentCollector({ time: 30000 });

            collector.on('collect', async i => {
                if (entries.has(i.user.id)) {
                    return i.reply({ content: 'You already entered!', ephemeral: true });
                }
                entries.add(i.user.id);
                await i.reply({ content: '🎰 You entered the draw!', ephemeral: true });
            });

            collector.on('end', async () => {
                if (entries.size === 0) {
                    embed.setDescription('😢 No one entered the draw!');
                    return msg.edit({ embeds: [embed], components: [] });
                }

                const entryArray = Array.from(entries);
                const winners = [];
                const prizePerWinner = Math.floor(prize / winnersCount);

                for (let i = 0; i < Math.min(winnersCount, entryArray.length); i++) {
                    const idx = Math.floor(Math.random() * entryArray.length);
                    const winnerId = entryArray.splice(idx, 1)[0];
                    winners.push(winnerId);
                    db.getUser(winnerId);
                    db.addBalance(winnerId, prizePerWinner);
                }

                embed.setDescription(`🎉 **LUCKY DRAW WINNERS!**\n\n${winners.map(w => `<@${w}> won **${prizePerWinner.toLocaleString()}** gems!`).join('\n')}\n\n**${entries.size}** people entered`);
                embed.setColor(PS99_COLORS.success);
                
                await msg.edit({ embeds: [embed], components: [] });
            });

        } else if (subcommand === 'quiz') {
            const question = interaction.options.getString('question');
            const answer = interaction.options.getString('answer').toLowerCase();
            const prize = interaction.options.getInteger('prize');

            const embed = new EmbedBuilder()
                .setTitle('❓ ═══ TRIVIA QUIZ! ═══ ❓')
                .setColor(PS99_COLORS.purple)
                .setDescription(`**Prize:** ${prize.toLocaleString()} gems\n\n**Question:**\n${question}\n\nType your answer in chat! First correct answer wins!`)
                .setFooter({ text: '💎 PS99 Casino 💎 | 60 seconds' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const filter = m => m.content.toLowerCase().includes(answer) && !m.author.bot;
            const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

            collector.on('collect', async m => {
                db.getUser(m.author.id, m.author.username);
                db.addBalance(m.author.id, prize);

                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 ═══ CORRECT! ═══ 🎉')
                    .setColor(PS99_COLORS.success)
                    .setDescription(`**${m.author.username}** got it right!\n\n**Answer:** ${answer}\n**Prize:** ${prize.toLocaleString()} gems`)
                    .setFooter({ text: '💎 PS99 Casino 💎' })
                    .setTimestamp();

                await interaction.channel.send({ embeds: [winEmbed] });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.channel.send({ embeds: [createErrorEmbed(`Time's up! The answer was: **${answer}**`)] });
                }
            });

        } else if (subcommand === 'scramble') {
            const word = interaction.options.getString('word');
            const prize = interaction.options.getInteger('prize');
            
            const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');

            const embed = new EmbedBuilder()
                .setTitle('🔤 ═══ WORD SCRAMBLE! ═══ 🔤')
                .setColor(PS99_COLORS.neon)
                .setDescription(`**Prize:** ${prize.toLocaleString()} gems\n\n**Unscramble this word:**\n\`\`\`\n${scrambled.toUpperCase()}\n\`\`\`\n\nType your answer in chat!`)
                .setFooter({ text: '💎 PS99 Casino 💎 | 45 seconds' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const filter = m => m.content.toLowerCase() === word.toLowerCase() && !m.author.bot;
            const collector = interaction.channel.createMessageCollector({ filter, time: 45000, max: 1 });

            collector.on('collect', async m => {
                db.getUser(m.author.id, m.author.username);
                db.addBalance(m.author.id, prize);

                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 ═══ WINNER! ═══ 🎉')
                    .setColor(PS99_COLORS.success)
                    .setDescription(`**${m.author.username}** unscrambled it!\n\n**Word:** ${word}\n**Prize:** ${prize.toLocaleString()} gems`)
                    .setTimestamp();

                await interaction.channel.send({ embeds: [winEmbed] });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.channel.send({ embeds: [createErrorEmbed(`Time's up! The word was: **${word}**`)] });
                }
            });

        } else if (subcommand === 'mathrace') {
            const prize = interaction.options.getInteger('prize');
            
            const ops = ['+', '-', '*'];
            const op = ops[Math.floor(Math.random() * ops.length)];
            const a = Math.floor(Math.random() * 50) + 10;
            const b = Math.floor(Math.random() * 20) + 5;
            const answer = eval(`${a} ${op} ${b}`);

            const embed = new EmbedBuilder()
                .setTitle('🧮 ═══ MATH RACE! ═══ 🧮')
                .setColor(PS99_COLORS.info)
                .setDescription(`**Prize:** ${prize.toLocaleString()} gems\n\n**Solve this:**\n\`\`\`\n${a} ${op} ${b} = ?\n\`\`\`\n\nFirst correct answer wins!`)
                .setFooter({ text: '💎 PS99 Casino 💎 | 30 seconds' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            const filter = m => parseInt(m.content) === answer && !m.author.bot;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async m => {
                db.getUser(m.author.id, m.author.username);
                db.addBalance(m.author.id, prize);

                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 ═══ CORRECT! ═══ 🎉')
                    .setColor(PS99_COLORS.success)
                    .setDescription(`**${m.author.username}** solved it first!\n\n**Answer:** ${answer}\n**Prize:** ${prize.toLocaleString()} gems`)
                    .setTimestamp();

                await interaction.channel.send({ embeds: [winEmbed] });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.channel.send({ embeds: [createErrorEmbed(`Time's up! The answer was: **${answer}**`)] });
                }
            });
        }
    }
};
