const channelMapping = require('../config/channelMapping');

async function sendMessage(client, message, channelId) {
    try {
        // 确保 client 已经准备好
        if (!client || !client.isReady()) {
            console.error('Discord client is not ready');
            return;
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            throw new Error('Could not find the specified channel');
        }

        await channel.send(message);
    } catch (error) {
        console.error('Error sending message to Discord:', error);
        throw error;
    }
}

module.exports = { sendMessage }; 