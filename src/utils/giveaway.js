const supabase = require('./supabase');
const { EmbedBuilder } = require('discord.js');

async function endGiveaway(giveawayId) {
    try {
        // Get giveaway data
        const { data: giveaway } = await supabase
            .from('giveaways')
            .select('*, giveaway_participants(*)')
            .eq('id', giveawayId)
            .single();

        if (!giveaway || giveaway.status !== 'active') {
            return;
        }

        const channel = await client.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);

        // Get all participants
        const { data: participants } = await supabase
            .from('giveaway_participants')
            .select()
            .eq('giveaway_id', giveawayId);

        if (!participants?.length) {
            await message.reply('Giveaway ended, but no one participated!');
            return;
        }

        // Select random winners
        const winners = selectRandomWinners(participants, giveaway.winners_count);

        const winnerEmbed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Ended')
            .setDescription(`
                Congratulations to the following wallet addresses:
                ${winners.map(w => w.wallet_address).join('\n')}
            `)
            .setColor('#00FF00');

        await message.reply({ embeds: [winnerEmbed] });

        // Update giveaway status
        await supabase
            .from('giveaways')
            .update({ status: 'ended' })
            .eq('id', giveawayId);

    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}

function selectRandomWinners(participants, count) {
    const shuffled = [...participants].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

module.exports = {
    endGiveaway,
    selectRandomWinners
}; 