require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, Events } = require('discord.js');
const { initializeGiveaways } = require('./utils/giveawayManager');

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

client.once(Events.ClientReady, async () => {
    console.log('Bot is ready!');
    // Initialize active giveaways when bot starts
    await initializeGiveaways(client);
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
