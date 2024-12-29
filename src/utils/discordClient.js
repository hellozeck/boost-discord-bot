const { Client, GatewayIntentBits } = require('discord.js');

let instance = null;

function createDiscordClient() {
    if (!instance) {
        instance = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                // Add other required intents here
            ]
        });
    }
    return instance;
}

module.exports = createDiscordClient(); 