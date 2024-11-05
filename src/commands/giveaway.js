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
        const winners = interaction.options.getInteger('winners');
        const endTime = new Date(interaction.options.getString('end_time'));

        if (endTime < new Date()) {
            return await interaction.reply({
                content: 'End time must be in the future!',
                ephemeral: true
            });
        }

        const giveawayEmbed = new EmbedBuilder()
            .setTitle('🎉 New Giveaway')
            .setDescription(`
                Number of Winners: ${winners}
                End Time: ${endTime.toLocaleString()}
                
                Click the button below to join!
            `)
            .setColor('#FF0000');

        const joinButton = new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('Join Giveaway')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(joinButton);

        const message = await interaction.reply({
            embeds: [giveawayEmbed],
            components: [row],
            fetchReply: true
        });

        // Save giveaway to Supabase
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

        if (error) {
            console.error('Error creating giveaway:', error);
            return;
        }

        // Set timeout for giveaway end
        setTimeout(() => endGiveaway(data.id, interaction.client), endTime - new Date());
    },
}; 