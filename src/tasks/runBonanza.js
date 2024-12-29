import { DuneClient } from "@duneanalytics/client-sdk";
import { sendMessage } from '../utils/sendToDiscord';
import dotenv from "dotenv";

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
        const { data, error } = await supabase
            .rpc('get_boost_participants');

        if (error) throw error;

        if (!data || data.length === 0) {
            throw new Error("没有找到参与者数据");
        }

        return data.map(row => ({
            recipient: row.wallet,
            boost_completed_count: Number(row.boost_completed_count)
        }));
    } catch (error) {
        console.error("从数据库获取参与者数据时出错:", error);
        throw error;
    }
}

export async function runBonanza() {
    try {
        console.log("Boost Guild Auto Boost starting...");
        
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

        const numWinners = 50;
        console.log(`Starting weighted lottery to select ${numWinners} winners...`);
        const winners = weightedLottery(data, numWinners);

        console.log("Lottery winners:");
        winners.forEach((winner, index) => {
            console.log(`${index + 1}. ${winner.wallet}`);
        });

        const fullMessage = `
🎰 **Boost Daily Bonanza Results**

📅 Date: ${new Date().toISOString().split('T')[0]}
👥 Total Participants: ${data.length}
🎁 Number of Winners: ${winners.length}

🏆 **Winners**:
${winners.map((winner, index) => `${index + 1}. <@${winner.user_id}>`).join('\n')}

Congratulations to the winners! Rewards will be issued within 24 hours.
Good luck next time to everyone else! 🍀
`;
        const messageParts = splitMessage(fullMessage);

        for (const part of messageParts) {
            await sendMessage(part);
        }

        // Update saveBonanzaResults call to use winner wallets
        await saveBonanzaResults(winners.map(w => w.wallet), data.length);

    } catch (error) {
        console.error("An error occurred during Bonanza:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
        }
        // Add error notification to Discord
        await sendMessage("❌ An error occurred during Daily Bonanza execution. Please check the logs.");
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