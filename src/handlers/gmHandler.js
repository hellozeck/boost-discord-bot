const supabase = require('../utils/supabase');

module.exports = async function gmHandler(message) {
    // List of emojis to randomly select from
    const emojis = ['🚀', '💪', '🔥', '⭐', '✨', '💫'];

    try {
        const { data, error } = await supabase.rpc('increment_gm_count', {
            p_user_id: message.author.id,
            p_username: message.author.username
        });

        if (error) throw error;

        // Handle case where data might be null/undefined
        const gmCount = data?.gm_count || 1;

        // Get 1-3 random emojis
        const emojiCount = Math.floor(Math.random() * 3) + 1;
        const selectedEmojis = [];
        for (let i = 0; i < emojiCount; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            selectedEmojis.push(randomEmoji);
        }

        // Reply with GBOOST and random emojis
        await message.reply(`GBOOST! ${selectedEmojis.join('')} (GM #${gmCount})`);

    } catch (error) {
        console.error('Error in GM handler:', error);
        // Fallback response in case of database error
        await message.reply(`GBOOST! ${selectedEmojis.join('')}`);
    }
}; 