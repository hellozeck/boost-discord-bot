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
        const walletAddress = interaction.options.getString('wallet');
        const userId = interaction.user.id;

        // Validate wallet address format
        if (!ethers.utils.isAddress(walletAddress)) {
            await interaction.reply({ content: 'Invalid EVM wallet address format. Please provide a valid address.', ephemeral: true });
            return;
        }

        try {
            const { data, error } = await supabase
                .from('boost.wallet_blind')
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
            await interaction.reply({ content: 'An error occurred while binding the wallet. Please try again later.', ephemeral: true });
        }
    },
};
