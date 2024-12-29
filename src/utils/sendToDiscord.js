const { EmbedBuilder } = require('discord.js');
const channelMapping = require('../config/channelMapping');

async function sendMessage(client, message, channelType = 'daily-bonanza') {
    try {
        // Get channel ID from channelMapping
        const channelId = Object.entries(channelMapping)
            .find(([_, value]) => value === channelType)?.[0];

        if (!channelId) {
            throw new Error(`Channel type ${channelType} not configured`);
        }

        const channel = await client.channels.fetch(channelId);
        
        // If message is a string, create a basic embed
        if (typeof message === 'string') {
            const embed = new EmbedBuilder()
                .setDescription(message)
                .setColor('#FF0000')
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } else {
            // If message is already a complete message options object, send directly
            await channel.send(message);
        }

        console.log(`Message sent to ${channelType} channel successfully`);
    } catch (error) {
        console.error('Error sending message to Discord:', error);
        throw error;
    }
}

module.exports = {
    sendMessage
}; 