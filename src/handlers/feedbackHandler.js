const { EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = async function feedbackHandler(message) {
    try {
        // Store feedback in Supabase
        const { error: insertError } = await supabase
            .from('user_feedback')
            .insert({
                user_id: message.author.id,
                username: message.author.username,
                content: message.content,
                created_at: new Date().toISOString()
            });

        if (insertError) throw insertError;

        // Create and send embed for feedback confirmation
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content)
            .addFields(
                { name: 'Status', value: '✅ Feedback successfully recorded!' }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });

    } catch (error) {
        console.error('Error in feedbackHandler:', error);
        const errorMsg = await message.channel.send(
            `${message.author}, an error occurred while processing your feedback.`
        );
        setTimeout(() => errorMsg.delete(), 5000);
    }
}; 