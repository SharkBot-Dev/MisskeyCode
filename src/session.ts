import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();

const mongoUri = process.env.MONGO_DB_URI;

if (!mongoUri) {
    throw new Error("MONGO_DB_URI が設定されていません。");
}

console.log(mongoUri)

export const mongoClient = new MongoClient(mongoUri);

export async function connectDB(): Promise<void> {
    try {
        await mongoClient.connect();
        console.log("MongoDB に接続しました。");
    } catch (error) {
        console.error("MongoDB への接続に失敗しました:", error);
        throw error;
    }
}