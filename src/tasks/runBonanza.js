const { DuneClient } = require("@duneanalytics/client-sdk");
const dotenv = require("dotenv");
const { EmbedBuilder } = require('discord.js');
const channelMapping = require('../config/channelMapping');
const { sendMessage } = require('../utils/sendToDiscord');

const supabase = require('../utils/supabase');
const client = require('../utils/discordClient');

dotenv.config();

const DUNE_QUEST_QUERY_ID = 3965522;

async function fetchDataFromDune() {
    const dune = new DuneClient(process.env.DUNE_API_KEY ?? "");
    const result = await dune.getLatestResult({ queryId: DUNE_QUEST_QUERY_ID });

    if (!result.result?.rows) {
        throw new Error("No data returned from Dune query");
    }

    return result.result.rows.map(row => ({
        recipient: row.recipient,
        boost_completed_count: Number(row.boost_completed_count)
    }));
}

function weightedLottery(participants, numWinners) {
    let totalTickets = participants.reduce((sum, p) => sum + p.boost_completed_count, 0);
    let winners = [];

    for (let i = 0; i < numWinners; i++) {
        if (participants.length === 0) break;

        let winningTicket = Math.floor(Math.random() * totalTickets);
        let ticketCounter = 0;

        for (let j = 0; j < participants.length; j++) {
            ticketCounter += participants[j].boost_completed_count;
            if (ticketCounter > winningTicket) {
                // Store both wallet and user_id in winners array
                winners.push({
                    wallet: participants[j].recipient,
                    user_id: participants[j].user_id
                });
                totalTickets -= participants[j].boost_completed_count;
                participants.splice(j, 1);
                break;
            }
        }
    }

    return winners;
}

function splitMessage(message, maxLength = 2000) {
    const parts = [];
    let currentPart = '';

    message.split('\n').forEach(line => {
        if (currentPart.length + line.length + 1 > maxLength) {
            parts.push(currentPart.trim());
            currentPart = '';
        }
        currentPart += line + '\n';
    });

    if (currentPart) {
        parts.push(currentPart.trim());
    }

    return parts;
}

async function saveParticipantsToDatabase(participants) {
    try {
        // 1. First, clear all existing data from the table
        const { error: deleteError } = await supabase
            .from('boost_participants')
            .delete()
            .neq('recipient', 'dummy_value');

        if (deleteError) throw deleteError;

        // 2. Insert new data in batches
        const BATCH_SIZE = 1000; // Recommended batch size for Supabase
        for (let i = 0; i < participants.length; i += BATCH_SIZE) {
            const batch = participants.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await supabase
                .from('boost_participants')
                .insert(batch);

            if (insertError) throw insertError;

            console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(participants.length / BATCH_SIZE)}`);
        }

        console.log(`Successfully saved ${participants.length} participants to database`);
    } catch (error) {
        console.error("Error saving participants to database:", error);
        throw error;
    }
}

async function fetchParticipantsFromDB() {
    try {
        let allData = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            const { data, error, count } = await supabase
                .rpc('get_boost_participants')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;

            if (!data || data.length === 0) {
                break;
            }

            allData = allData.concat(data);

            if (data.length < pageSize) {
                break;
            }

            page++;
        }

        if (allData.length === 0) {
            throw new Error("No participants data found");
        }

        console.log(`Total participants fetched: ${allData.length}`);

        return allData.map(row => ({
            recipient: row.wallet,
            user_id: row.user_id,
            boost_completed_count: Number(row.boost_completed_count)
        }));
    } catch (error) {
        console.error("Error fetching participants from database:", error);
        throw error;
    }
}

async function runBonanza(client) {
    try {
        // check is bonanza enble
        const { data: settings, error: settingsError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'bonanza_enabled')
            .single();

        if (settingsError) {
            console.error('Error fetching bonanza settings:', settingsError);
            return;
        }

        if (!settings?.value) {
            console.log('Bonanza is currently disabled');
            return;
        }

        // make sure client is ready
        if (!client || !client.isReady()) {
            console.error('Discord client is not ready');
            return;
        }

        console.log("Boost Guild Auto Boost starting...");

        // Directly use the channel ID for daily-bonanza
        const channelId = '1272752734721937480'; // Daily Bonanza channel
        if (!channelId) {
            throw new Error('Channel ID not configured');
        }

        // Step 1: Fetch data from Dune
        console.log("Fetching participants data from Dune...");
        const duneData = await fetchDataFromDune();
        console.log(`Retrieved ${duneData.length} participants from Dune`);

        // Step 2: Save to database
        console.log("Saving participants data to database...");
        await saveParticipantsToDatabase(duneData);

        // Step 3: Fetch from database for lottery
        console.log("Fetching participants data from database...");
        const data = await fetchParticipantsFromDB();
        console.log(`Retrieved ${data.length} participants from database`);

        const numWinners = parseInt(process.env.BONANZA_WINNERS_COUNT) || 20;
        console.log(`Starting weighted lottery to select ${numWinners} winners...`);
        const winners = weightedLottery(data, numWinners);

        console.log("Lottery winners:");
        winners.forEach((winner, index) => {
            console.log(`${index + 1}. Wallet: ${winner.wallet}, User ID: ${winner.user_id}`);
        });

        const fullMessage = `
🎰 **Boost Daily Bonanza Results**

📅 Date: ${new Date().toISOString().split('T')[0]}
👥 Total Participants: ${duneData.length}
🎁 Number of Winners: ${winners.length}

🏆 **Winners**:
${winners.map((winner, index) => `${index + 1}. <@${winner.user_id}>`).join('\n')}

Congratulations to the winners! Rewards will be issued within 2 hours.
Good luck next time to everyone else! 🍀
`;
        const messageParts = splitMessage(fullMessage);

        for (const part of messageParts) {
            try {
                await sendMessage(client, part, channelId);
            } catch (error) {
                console.error('Failed to send message part:', error);
            }
        }

        await saveBonanzaResults(winners.map(w => w.wallet), data.length);

    } catch (error) {
        console.error("An error occurred during Bonanza:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
        }
        try {
            // Use the same channel ID for error messages
            await sendMessage(client, "❌ An error occurred during Daily Bonanza execution. Please check the logs.", '1272752734721937480');
        } catch (discordError) {
            console.error('Failed to send error message to Discord:', discordError);
        }
    }
}

async function saveBonanzaResults(winners, totalParticipants) {
    try {
        const { error } = await supabase
            .from('bonanza_results')
            .insert({
                draw_date: new Date().toISOString().split('T')[0],
                winners: winners,
                total_participants: totalParticipants
            });

        if (error) throw error;
    } catch (error) {
        console.error("Error saving Bonanza results:", error);
    }
}

module.exports = {
    runBonanza
}; 