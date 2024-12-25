import { DuneClient } from "@duneanalytics/client-sdk";
import { sendMessage } from '../utils/sendToDiscord';
import fs from "fs";
import Papa from "papaparse";
import dotenv from "dotenv";

dotenv.config();

const DUNE_QUEST_QUERY_ID = 3965522;
const FILENAME_PREFIX = "recipient_boost_activity";

interface Participant {
    recipient: string;
    boost_completed_count: number;
}

async function fetchDataFromDune(): Promise<Participant[]> {
    const dune = new DuneClient(process.env.DUNE_API_KEY ?? "");
    const result = await dune.getLatestResult({ queryId: DUNE_QUEST_QUERY_ID });

    if (!result.result?.rows) {
        throw new Error("No data returned from Dune query");
    }

    return result.result.rows.map(row => ({
        recipient: row.recipient as string,
        boost_completed_count: Number(row.boost_completed_count)
    }));
}

function saveDataToFile(data: Participant[]): string {
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `${FILENAME_PREFIX}_${currentDate}.csv`;

    const csvContent = Papa.unparse(data);
    fs.writeFileSync(filename, csvContent);

    return filename;
}

function weightedLottery(participants: Participant[], numWinners: number): string[] {
    let totalTickets = participants.reduce((sum, p) => sum + p.boost_completed_count, 0);
    let winners: string[] = [];

    for (let i = 0; i < numWinners; i++) {
        if (participants.length === 0) break;

        let winningTicket = Math.floor(Math.random() * totalTickets);
        let ticketCounter = 0;

        for (let j = 0; j < participants.length; j++) {
            ticketCounter += participants[j].boost_completed_count;
            if (ticketCounter > winningTicket) {
                winners.push(participants[j].recipient);
                totalTickets -= participants[j].boost_completed_count;
                participants.splice(j, 1);
                break;
            }
        }
    }

    return winners;
}

function splitMessage(message: string, maxLength: number = 2000): string[] {
    const parts: string[] = [];
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

export async function runBonanza() {
    try {
        console.log("Boost Guild Auto Boost starting...");
        console.log("Fetching data from Dune Analytics...");
        const data = await fetchDataFromDune();
        console.log(`Fetched ${data.length} participants`);

        const filename = saveDataToFile(data);
        console.log(`Data saved to ${filename}`);

        const numWinners = 50;
        console.log(`Performing weighted lottery to select ${numWinners} winners...`);
        const winners = weightedLottery(data, numWinners);

        console.log("Lottery winners:");
        winners.forEach((winner, index) => {
            console.log(`${index + 1}. ${winner}`);
        });

        const fullMessage = `Today's Boost Daily Bonanza winners (Total participants: ${data.length}):\n${winners.map((winner, index) => `${index + 1}. ${winner}`).join('\n')}`;
        const messageParts = splitMessage(fullMessage);

        for (const part of messageParts) {
            await sendMessage(part);
        }

        // 可选：将结果保存到数据库
        await saveBonanzaResults(winners, data.length);

    } catch (error) {
        console.error("An error occurred during Bonanza:", error);
        if (error instanceof Error) {
            console.error("Error message:", error.message);
        }
        // 可以添加错误通知到 Discord
        await sendMessage("❌ Daily Bonanza 执行过程中发生错误，请检查日志。");
    }
}

async function saveBonanzaResults(winners: string[], totalParticipants: number) {
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