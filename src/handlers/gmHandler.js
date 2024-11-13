const supabase = require('../utils/supabase');

module.exports = async function gmHandler(message) {
    // List of emojis to randomly select from
    const emojis = ['🚀', '💪', '🔥', '⭐', '✨', '💫'];

    try {
        // Record GM activity in Supabase
        const { error } = await supabase.rpc('increment_gm_count', {
            p_user_id: message.author.id,
            p_username: message.author.username
        });

        if (error) throw error;

        // Get 1-3 random emojis
        const emojiCount = Math.floor(Math.random() * 3) + 1;
        const selectedEmojis = [];
        for (let i = 0; i < emojiCount; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            selectedEmojis.push(randomEmoji);
        }

        // Reply with GBOOST and random emojis
        await message.reply(`GBOOST! ${selectedEmojis.join('')}`);

    } catch (error) {
        console.error('Error in GM handler:', error);
    }
}; 