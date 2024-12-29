const supabase = require('../utils/supabase');

module.exports = async function gmHandler(message) {
    // List of emojis to randomly select from
    const emojis = ['🚀', '💪', '🔥', '⭐', '✨', '💫'];

    // Generate 1-3 random emojis
    const emojiCount = Math.floor(Math.random() * 3) + 1;
    const selectedEmojis = [];
    for (let i = 0; i < emojiCount; i++) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        selectedEmojis.push(randomEmoji);
    }

    try {
        // Call RPC to increment GM count
        const { data, error } = await supabase.rpc('increment_gm_count', {
            p_user_id: message.author.id,
            p_username: message.author.username
        });

        if (error) throw error;

        // Get the updated count from response
        const gmCount = data?.[0]?.gm_count;

        // Reply with emojis and GM count
        await message.reply(`GBOOST! ${selectedEmojis.join('')} (GM #${gmCount})`);

    } catch (error) {
        console.error('Error in GM handler:', error);
        // Fallback response without count on error
        await message.reply(`GBOOST! ${selectedEmojis.join('')}`);
    }
}; 