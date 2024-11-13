const { EmbedBuilder } = require('discord.js');

module.exports = async function feedbackHandler(message) {
    // Create embed for feedback display
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('New Feedback Received!')
        .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL()
        })
        .setDescription(message.content)
        .addFields(
            { name: 'User ID', value: message.author.id },
            { name: 'Submission Time', value: new Date().toLocaleString() }
        )
        .setTimestamp();

    try {
        // Store feedback in database if you have one
        // await saveFeedbackToDatabase({
        //     userId: message.author.id,
        //     content: message.content,
        //     timestamp: new Date()
        // });

        // Send formatted feedback in the feedback channel
        await message.channel.send({ embeds: [embed] });

        // Add reaction to indicate receipt
        await message.react('✅');

        // Optional: Send confirmation message to user
        await message.author.send('Thank you for your feedback! We will review it carefully.').catch(() => {
            // Ignore error if user has DMs disabled
        });
    } catch (error) {
        console.error('Error processing feedback:', error);
        await message.react('❌');
    }
}; 