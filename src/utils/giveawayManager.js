const supabase = require('./supabase');
const { EmbedBuilder } = require('discord.js');

// Function to end a giveaway
async function endGiveaway(giveawayId, client) {
    try {
        // Get giveaway info
        const { data: giveaway, error: giveawayError } = await supabase
            .from('giveaways')
            .select('*, giveaway_participants(*)')
            .eq('id', giveawayId)
            .single();

        if (giveawayError || !giveaway) {
            console.error('Error fetching giveaway:', giveawayError);
            return;
        }

        // Select winners randomly
        const participants = giveaway.giveaway_participants;
        const winners = [];
        for (let i = 0; i < Math.min(giveaway.winners_count, participants.length); i++) {
            const winnerIndex = Math.floor(Math.random() * participants.length);
            winners.push(participants[winnerIndex]);
            participants.splice(winnerIndex, 1);
        }

        // Update giveaway status
        const { error: updateError } = await supabase
            .from('giveaways')
            .update({ status: 'ended' })
            .eq('id', giveawayId);

        if (updateError) {
            console.error('Error updating giveaway status:', updateError);
            return;
        }

        // Get the channel and message
        const channel = await client.channels.fetch(giveaway.channel_id);
        const message = await channel.messages.fetch(giveaway.message_id);

        // Print basic winner information first
        console.log('Giveaway winners:', winners.map(w => ({
            user_id: w.user_id
        })));

        // Try to get wallet addresses from giveaway_participants table
        try {
            const winnerDetails = await Promise.all(
                winners.map(async (winner) => {
                    try {
                        const { data, error } = await supabase
                            .from('giveaway_participants')
                            .select('user_id, wallet_address')
                            .eq('giveaway_id', giveawayId)
                            .eq('user_id', winner.user_id)
                            .maybeSingle();

                        if (error) {
                            console.log(`Unable to fetch participant data for user ${winner.user_id}:`, error);
                            return {
                                user_id: winner.user_id,
                                wallet_address: null
                            };
                        }

                        return {
                            user_id: winner.user_id,
                            wallet_address: data?.wallet_address
                        };
                    } catch (error) {
                        console.log(`Error processing participant ${winner.user_id}:`, error);
                        return {
                            user_id: winner.user_id,
                            wallet_address: null
                        };
                    }
                })
            );

            console.log('Winner details with wallet addresses:', winnerDetails);

            // Save winner information to giveaway_winners table
            await Promise.all(
                winnerDetails.map(winner => {
                    if (winner.wallet_address) {
                        return supabase
                            .from('giveaway_winners')
                            .insert({
                                giveaway_id: giveawayId,
                                user_id: winner.user_id,
                                wallet_address: winner.wallet_address
                            });
                    }
                    return Promise.resolve();
                })
            );

        } catch (error) {
            console.error('Error processing winner details:', error);
        }

        // Create winners announcement
        const winnersEmbed = new EmbedBuilder()
            .setTitle('🎉 Giveaway Ended!')
            .setDescription(
                winners.length > 0
                    ? `Congratulations to the winners:\n${winners.map(w => `<@${w.user_id}>`).join('\n')}`
                    : 'No winners (no participants)'
            )
            .setColor('#00FF00');

        // Update the original message
        await message.edit({ embeds: [winnersEmbed], components: [] });

        // Send winners announcement
        await channel.send({
            content: winners.length > 0
                ? `Congratulations to the winners! ${winners.map(w => `<@${w.user_id}>`).join(' ')}`
                : 'The giveaway has ended, but there were no participants.',
            embeds: [winnersEmbed]
        });

    } catch (err) {
        console.error('Error ending giveaway:', err);
    }
}

// Initialize active giveaways
async function initializeGiveaways(client) {
    try {
        // Get all active giveaways
        const { data: activeGiveaways, error } = await supabase
            .from('giveaways')
            .select('*')
            .eq('status', 'active');

        if (error) {
            console.error('Error fetching active giveaways:', error);
            return;
        }

        const now = new Date();

        // Set up timeouts for each active giveaway
        for (const giveaway of activeGiveaways) {
            const endTime = new Date(giveaway.end_time);
            const timeLeft = endTime - now;

            if (timeLeft <= 0) {
                // End immediately if end time has passed
                await endGiveaway(giveaway.id, client);
            } else {
                // Set timeout for future end time
                setTimeout(() => endGiveaway(giveaway.id, client), timeLeft);
            }
        }

        console.log(`Initialized ${activeGiveaways.length} active giveaways`);

    } catch (err) {
        console.error('Error initializing giveaways:', err);
    }
}

module.exports = {
    endGiveaway,
    initializeGiveaways
}; 