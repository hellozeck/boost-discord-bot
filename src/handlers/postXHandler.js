const { EmbedBuilder } = require('discord.js');
const { supabase } = require('../utils/supabaseClient');
const { checkBoostTwitterBinding } = require('../utils/boostApi');

module.exports = async function postXHandler(message) {
    try {
        // Check if message contains X (Twitter) link
        const twitterRegex = /(https?:\/\/(twitter|x)\.com\/(\w+)\/status\/(\d+))/i;
        const match = message.content.match(twitterRegex);

        if (!match) {
            await message.delete();
            const reminder = await message.channel.send(
                `${message.author}, this channel only allows Twitter/X links!`
            );
            setTimeout(() => reminder.delete(), 5000);
            return;
        }

        const [_, tweetUrl, _, username, tweetId] = match;

        // Step 1: Get user's wallet address from wallet_blind table
        const { data: walletData, error: walletError } = await supabase
            .from('wallet_blind')
            .select('wallet_address')
            .eq('userid', message.author.id)
            .single();

        if (walletError || !walletData) {
            await message.delete();
            const reminder = await message.channel.send(
                `${message.author}, please bind your wallet first!`
            );
            setTimeout(() => reminder.delete(), 5000);
            return;
        }

        // Step 2: Check if tweet was already shared
        const { data: existingTweet, error: tweetError } = await supabase
            .from('shared_tweets')
            .select()
            .eq('tweet_url', tweetUrl)
            .eq('user_id', message.author.id)
            .single();

        if (existingTweet) {
            await message.delete();
            const reminder = await message.channel.send(
                `${message.author}, you have already shared this tweet!`
            );
            setTimeout(() => reminder.delete(), 5000);
            return;
        }

        // Step 3: Verify Twitter binding with Boost API
        const isTwitterBound = await checkBoostTwitterBinding(
            walletData.wallet_address,
            username
        );

        if (!isTwitterBound) {
            await message.delete();
            const reminder = await message.channel.send(
                `${message.author}, your wallet must be bound to this Twitter account in Boost!`
            );
            setTimeout(() => reminder.delete(), 5000);
            return;
        }

        // Step 4: Store verified tweet in Supabase
        const { error: insertError } = await supabase
            .from('shared_tweets')
            .insert({
                user_id: message.author.id,
                tweet_url: tweetUrl,
                wallet_address: walletData.wallet_address,
                shared_at: new Date().toISOString()
            });

        if (insertError) {
            throw insertError;
        }

        // Create and send embed for verified tweet
        const embed = new EmbedBuilder()
            .setColor('#1DA1F2')
            .setAuthor({
                name: message.author.username,
                iconURL: message.author.displayAvatarURL()
            })
            .setDescription(message.content)
            .addFields(
                { name: 'Wallet', value: `${walletData.wallet_address.slice(0, 6)}...${walletData.wallet_address.slice(-4)}` }
            )
            .setTimestamp();

        await message.channel.send({ embeds: [embed] });
        await message.delete();

    } catch (error) {
        console.error('Error in postXHandler:', error);
        await message.delete();
        const errorMsg = await message.channel.send(
            `${message.author}, an error occurred while processing your tweet.`
        );
        setTimeout(() => errorMsg.delete(), 5000);
    }
}; 