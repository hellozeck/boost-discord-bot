const { SlashCommandBuilder } = require('discord.js');
const { ethers } = require('ethers');
const supabase = require('../utils/supabase');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Bind your EVM wallet address')
        .addStringOption(option =>
            option.setName('wallet')
                .setDescription('Your EVM wallet address')
                .setRequired(true)),

    async execute(interaction) {
        // Add guild ID verification
        const allowedGuildId = process.env.ALLOWED_GUILD_ID; // Need to set allowed guild ID in environment variables
        if (interaction.guildId !== allowedGuildId) {
            await interaction.reply({
                content: 'This command is only available for members of the specified server.',
                ephemeral: true
            });
            return;
        }

        const walletAddress = interaction.options.getString('wallet');
        const userId = interaction.user.id;

        // Validate wallet address format
        if (!ethers.isAddress(walletAddress)) {
            await interaction.reply({ content: 'Invalid EVM wallet address format. Please provide a valid address.', ephemeral: true });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('wallet_blind')
                .upsert(
                    {
                        userid: userId,
                        wallet_address: walletAddress,
                        updated_at: new Date().toISOString()
                    },
                    {
                        onConflict: 'userid',
                        returning: 'minimal'
                    }
                );

            if (error) throw error;

            await interaction.reply({ content: `Successfully bound wallet address: ${walletAddress}`, ephemeral: true });
        } catch (error) {
            console.error('Error binding wallet:', error);
            console.error('Error details:', error.message, error.stack);
            await interaction.reply({ content: 'An error occurred while binding the wallet. Please try again later.', ephemeral: true });
        }
    },
};
