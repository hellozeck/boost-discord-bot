require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const { initializeGiveaways } = require('./utils/giveawayManager');
const { runBonanza } = require('./tasks/runBonanza');
const { scheduleJob } = require('node-schedule');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // Add other required intents here
    ]
});

// Create a collection to store all events
client.events = new Collection();

// Read all files in the events directory
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    client.events.set(event.name, event);
}

// Create a collection to store all commands
client.commands = new Collection();

// Read command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    console.log(`Loading command from file: ${file}`);
    console.log('Command data:', command.data);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// Function to deploy commands
async function deployCommands() {
    const commands = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        console.log(`Loading command from file: ${file}`);
        console.log('Command data:', command.data);
        commands.push(command.data.toJSON());
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

async function init() {
    // Execute immediately if --run-now or -r flag is present
    if (args.includes('--run-now') || args.includes('-r')) {
        console.log('Executing Bonanza immediately...');
        await runBonanza();
        process.exit(0);
    }

    // Original scheduled task logic
    console.log('Setting up scheduled task...');
    scheduleJob('0 0 * * *', async () => {
        console.log('Starting scheduled Bonanza execution...');
        await runBonanza();
    });
}

client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');
    // Initialize active giveaways when bot starts
    await initializeGiveaways(client);
    // Initialize Bonanza schedule
    await init();
});

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Login successful');
        return deployCommands();
    })
    .catch(error => console.error('Login failed:', error));

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Add command handling logs
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    console.log(`[Command] Received command: ${interaction.commandName}`);

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.log(`[Command] Command ${interaction.commandName} not found`);
        return;
    }

    try {
        console.log(`[Command] Executing command: ${interaction.commandName}`);
        await command.execute(interaction);
        console.log(`[Command] Command ${interaction.commandName} executed successfully`);
    } catch (error) {
        console.error(`[Command] Error executing ${interaction.commandName}:`, error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'There was an error executing this command!',
                ephemeral: true
            });
        } else {
            await interaction.followUp({
                content: 'There was an error executing this command!',
                ephemeral: true
            });
        }
    }
});

// Add ready event log
client.once(Events.ClientReady, () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log('[Bot] Commands loaded:', Array.from(client.commands.keys()));
});

