require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection } = require('discord.js');

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

client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Login successful'))
    .catch(error => console.error('Login failed:', error));

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
