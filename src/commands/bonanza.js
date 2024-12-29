const { SlashCommandBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bonanza')
        .setDescription('Manage Daily Bonanza status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable Daily Bonanza'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable Daily Bonanza'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View Daily Bonanza current status')),

    async execute(interaction) {
        // Verify administrator permissions
        // Only administrators can manage Bonanza status
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            await interaction.reply({
                content: 'Only administrators can manage Bonanza status',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'enable':
                    await enableBonanza(interaction);
                    break;
                case 'disable':
                    await disableBonanza(interaction);
                    break;
                case 'status':
                    await getBonanzaStatus(interaction);
                    break;
            }
        } catch (error) {
            console.error('Bonanza command error:', error);
            await interaction.reply({
                content: 'An error occurred while executing the command, please try again later',
                ephemeral: true
            });
        }
    },
};

async function enableBonanza(interaction) {
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'bonanza_enabled',
            value: true,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;

    await interaction.reply({
        content: '✅ Daily Bonanza enabled! The draw will be executed automatically every day at UTC 00:00.',
        ephemeral: false
    });
}

async function disableBonanza(interaction) {
    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key: 'bonanza_enabled',
            value: false,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;

    await interaction.reply({
        content: '⏸️ Daily Bonanza disabled.',
        ephemeral: false
    });
}

async function getBonanzaStatus(interaction) {
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'bonanza_enabled')
        .single();

    if (error) throw error;

    const status = data?.value ? 'Enabled' : 'Disabled';
    await interaction.reply({
        content: `🎯 Daily Bonanza current status: ${status}`,
        ephemeral: true
    });
} 