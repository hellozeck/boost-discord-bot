require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // 添加其他所需的 intents
    ]
});

client.login(process.env.DISCORD_TOKEN);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
