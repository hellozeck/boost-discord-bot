const { MongoClient } = require('mongodb');

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Successfully connected to the database");
        return client.db("discordBot");
    } catch (error) {
        console.error("Failed to connect to the database:", error);
        process.exit(1);
    }
}

module.exports = { connectToDatabase };
