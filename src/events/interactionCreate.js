const { Events } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'join_giveaway') {
            try {
                const userId = interaction.user.id;
                const messageId = interaction.message.id;

                const { data: walletData, error: walletError } = await supabase
                    .from('wallet_blind')
                    .select('wallet_address')
                    .eq('userid', userId)
                    .single();

                if (walletError || !walletData) {
                    await interaction.reply({
                        content: 'Please bind your wallet first before joining the giveaway.',
                        ephemeral: true
                    });
                    return;
                }

                const { data: giveaway, error: giveawayError } = await supabase
                    .from('giveaways')
                    .select('id, status')
                    .eq('message_id', messageId)
                    .single();

                if (giveawayError || !giveaway) {
                    console.error('Error finding giveaway:', giveawayError);
                    await interaction.reply({
                        content: 'Error finding giveaway. Please try again later.',
                        ephemeral: true
                    });
                    return;
                }

                if (giveaway.status !== 'active') {
                    await interaction.reply({
                        content: 'This giveaway has ended.',
                        ephemeral: true
                    });
                    return;
                }

                const { data: existingEntry } = await supabase
                    .from('giveaway_participants')
                    .select()
                    .eq('giveaway_id', giveaway.id)
                    .eq('user_id', userId)
                    .single();

                if (existingEntry) {
                    await interaction.reply({
                        content: 'You have already entered this giveaway!',
                        ephemeral: true
                    });
                    return;
                }

                const { error } = await supabase
                    .from('giveaway_participants')
                    .insert({
                        giveaway_id: giveaway.id,
                        user_id: userId,
                        wallet_address: walletData.wallet_address
                    });

                if (error) {
                    console.error('Error adding participant:', error);
                    await interaction.reply({
                        content: 'Error joining giveaway. Please try again later.',
                        ephemeral: true
                    });
                    return;
                }

                await interaction.reply({
                    content: 'You have successfully entered the giveaway! Good luck!',
                    ephemeral: true
                });

            } catch (err) {
                console.error('Unexpected error:', err);
                await interaction.reply({
                    content: 'An unexpected error occurred. Please try again later.',
                    ephemeral: true
                });
            }
        }
    },
};

