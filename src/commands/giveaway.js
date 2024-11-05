const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { endGiveaway } = require('../utils/giveawayManager');
const supabase = require('../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Create a new giveaway')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('winners')
                .setDescription('Number of winners')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('end_time')
                .setDescription('End time (format: YYYY-MM-DD HH:mm)')
                .setRequired(true)),

    async execute(interaction) {
        console.log(`[Giveaway] Command started at ${new Date().toISOString()}`);

        // Defer the reply to let Discord know we're processing
        await interaction.deferReply();
        console.log('[Giveaway] Reply deferred');

        const winners = interaction.options.getInteger('winners');
        const endTime = new Date(interaction.options.getString('end_time'));
        console.log(`[Giveaway] Parsed input - winners: ${winners}, endTime: ${endTime}`);

        if (endTime < new Date()) {
            console.log('[Giveaway] Invalid end time - must be in future');
            return await interaction.editReply({
                content: 'End time must be in the future!',
                ephemeral: true
            });
        }

        const startEmbed = Date.now();
        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 New Giveaway')
            .setDescription(`
                Number of Winners: ${winners}
                End Time: ${endTime.toLocaleString()}
                
                Click the button below to join!
            `)
            .setColor('#FF0000');
        console.log(`[Giveaway] Embed created in ${Date.now() - startEmbed}ms`);

        const startReply = Date.now();
        const message = await interaction.editReply({
            embeds: [giveawayEmbed],
            components: [row],
            fetchReply: true
        });
        console.log(`[Giveaway] Reply sent in ${Date.now() - startReply}ms`);

        // Save giveaway to Supabase
        try {
            const startDb = Date.now();
            const { data, error } = await supabase
                .from('giveaways')
                .insert({
                    message_id: message.id,
                    channel_id: interaction.channelId,
                    end_time: endTime.toISOString(),
                    winners_count: winners,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;
            console.log(`[Giveaway] Database operation completed in ${Date.now() - startDb}ms`);

            // Set timeout for giveaway end
            setTimeout(() => endGiveaway(data.id, interaction.client), endTime - new Date());
            console.log(`[Giveaway] Command completed successfully at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[Giveaway] Error creating giveaway:', error);
            await interaction.followUp({
                content: 'There was an error creating the giveaway.',
                ephemeral: true
            });
        }
    },
}; 