const { Events } = require('discord.js');
const handlers = require('../handlers');
const channelMapping = require('../config/channelMapping');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;

        const channelId = message.channel.id;

        try {
            const handlerName = channelMapping[channelId];
            if (!handlerName) return;

            const handler = handlers[handlerName];
            if (handler) {
                await handler(message);
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    }
}; 