const { Client, GatewayIntentBits, Collection, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
const { startUptimeServer, startPingLoop } = require('./utils/uptime');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildInvites
    ],
    partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.prefixCommands = new Collection();
client.buttons = new Collection();
client.cooldowns = new Collection();
client.activeGames = new Collection();

function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded slash command: ${command.data.name}`);
            }
        }
    }
}

function loadPrefixCommands() {
    const prefixPath = path.join(__dirname, 'prefixCommands');
    if (fs.existsSync(prefixPath)) {
        const prefixFiles = fs.readdirSync(prefixPath).filter(file => file.endsWith('.js'));
        for (const file of prefixFiles) {
            const command = require(path.join(prefixPath, file));
            if (command.name && command.execute) {
                client.prefixCommands.set(command.name, command);
                if (command.aliases) {
                    for (const alias of command.aliases) {
                        client.prefixCommands.set(alias, command);
                    }
                }
                console.log(`✅ Loaded prefix command: ${command.name}`);
            }
        }
    }
}

function loadButtons() {
    const buttonsPath = path.join(__dirname, 'buttons');
    if (fs.existsSync(buttonsPath)) {
        const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));
        for (const file of buttonFiles) {
            const button = require(path.join(buttonsPath, file));
            if (button.customId && button.execute) {
                client.buttons.set(button.customId, button);
                console.log(`✅ Loaded button: ${button.customId}`);
            }
        }
    }
}

function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(path.join(eventsPath, file));
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`✅ Loaded event: ${event.name}`);
        }
    }
}

async function registerCommands() {
    const commands = [];
    let commandList = [];
    
    client.commands.forEach((cmd, index) => {
        try {
            const json = cmd.data.toJSON();
            commands.push(json);
            commandList.push(cmd.data.name);
        } catch (err) {
            console.error(`❌ Error converting command ${index} (${cmd.data.name}):`, err.message);
        }
    });
    
    if (commands.length === 0) {
        console.log('No commands to register');
        return;
    }
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log(`🔄 Registering ${commands.length} slash commands...`);
        const response = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ Successfully registered ${commands.length} slash commands!`);
        console.log(`📋 Registered commands: ${response.map(cmd => cmd.name).join(', ')}`);
    } catch (error) {
        console.error('❌ Error registering commands:', error.message);
        if (error.rawError && error.rawError.errors) {
            console.error('Detailed errors:', JSON.stringify(error.rawError.errors, null, 2));
        }
    }
}

async function refreshCommands() {
    console.log('🔄 Force refreshing command cache...');
    
    // Clear the command cache
    client.commands.clear();
    
    // Reload all commands fresh
    loadCommands();
    
    // Re-register with Discord
    await registerCommands();
}

client.on('ready', async () => {
    console.log(`\n🎰 ═══════════════════════════════════════`);
    console.log(`   ${client.user.tag} is now online!`);
    console.log(`   Servers: ${client.guilds.cache.size}`);
    console.log(`   Users: ${client.users.cache.size}`);
    console.log(`🎰 ═══════════════════════════════════════\n`);
    
    client.user.setActivity('🎰 /slots | !help', { type: 3 });
    
    // Force refresh commands on startup to ensure new commands show up after deployment
    console.log('📝 Performing startup command registration...');
    await registerCommands();
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}:`, error);
            const reply = { content: '❌ An error occurred while executing this command!', ephemeral: true };
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (replyError) {
                console.error(`Failed to reply to error in ${interaction.commandName}:`, replyError.message);
            }
        }
    } else if (interaction.isButton()) {
        const [buttonId] = interaction.customId.split('_');
        const button = client.buttons.get(buttonId);
        
        if (button) {
            try {
                await button.execute(interaction, client);
            } catch (error) {
                console.error(`Error handling button ${buttonId}:`, error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ An error occurred!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
                    }
                } catch (replyError) {
                    console.error(`Failed to reply to button error:`, replyError.message);
                }
            }
        }
    } else if (interaction.isStringSelectMenu()) {
        const [buttonId] = interaction.customId.split('_');
        const button = client.buttons.get(buttonId);
        
        if (button) {
            try {
                await button.execute(interaction, client);
            } catch (error) {
                console.error(`Error handling select menu ${buttonId}:`, error);
                try {
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: '❌ An error occurred!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ An error occurred!', ephemeral: true });
                    }
                } catch (replyError) {
                    console.error(`Failed to reply to select menu error:`, replyError.message);
                }
            }
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;
    
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.prefixCommands.get(commandName);
    if (!command) return;
    
    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error);
        await message.reply('❌ An error occurred while executing this command!');
    }
});

loadCommands();
loadPrefixCommands();
loadButtons();
loadEvents();

startUptimeServer();
startPingLoop();

const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN environment variable is not set!');
    console.log('Please set your Discord bot token in the Secrets tab.');
} else {
    client.login(token).catch(err => {
        console.error('❌ Failed to login:', err.message);
    });
}
