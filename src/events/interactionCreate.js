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

                const { data: giveaway, error: giveawayError } = await supabase
                    .from('giveaways')
                    .select('id')
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

                await interaction.reply({
                    content: 'Please enter your wallet address to participate in the giveaway.',
                    ephemeral: true
                });

                const filter = m => m.author.id === userId;
                const channel = interaction.channel;

                try {
                    const collected = await channel.awaitMessages({
                        filter,
                        max: 1,
                        time: 60000,
                        errors: ['time']
                    });

                    const walletAddress = collected.first().content;

                    const { error } = await supabase
                        .from('giveaway_participants')
                        .insert({
                            giveaway_id: giveaway.id,
                            user_id: userId,
                            wallet_address: walletAddress
                        });

                    if (error) {
                        console.error('Error adding participant:', error);
                        await interaction.followUp({
                            content: 'Error joining giveaway. Please try again later.',
                            ephemeral: true
                        });
                        return;
                    }

                    await interaction.followUp({
                        content: 'You have successfully entered the giveaway! Good luck!',
                        ephemeral: true
                    });

                } catch (err) {
                    await interaction.followUp({
                        content: 'No wallet address provided. Please try again.',
                        ephemeral: true
                    });
                }

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

