require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        // 添加其他所需的 intents
    ]
});

client.login(config.token);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});
