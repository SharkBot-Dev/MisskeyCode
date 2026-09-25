import { Client, GatewayIntentBits } from "discord.js"

import { config } from "dotenv"

config();

import fs from "fs";
import { commands } from "./cache/commands.js";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { app } from "./server.js";
import { connectDB } from "./session.js";

const client = new Client({
    intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
})


async function loadCommands() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const foldersPath = path.join(__dirname, "commands");
    const entries = fs.readdirSync(foldersPath, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isFile() && (entry.name.endsWith(".js"))) {
            const filePath = path.join(foldersPath, entry.name);
            const command = await import(pathToFileURL(filePath).href);

            if ("data" in command && "execute" in command) {
                commands.set(command.data.name, command);
                console.log(`コマンド「${command.data.name}」を読み込みました。`);
            } else {
                console.warn(`${filePath} は "data" または "execute" が不足しています。`);
            }
        }
    }
}

export async function loadEvents() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const eventsPath = path.join(__dirname, 'events');
    const eventFolders = fs.readdirSync(eventsPath);

    for (const folder of eventFolders) {
        const folderPath = path.join(eventsPath, folder);
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const eventFiles = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        const eventName = folder;

        for (const file of eventFiles) {
            const filePath = path.join(folderPath, file);
            const event = await import(pathToFileURL(filePath).href);

            if (typeof event !== 'function' && typeof event.execute !== 'function') {
                console.warn(`${file} は有効なイベント関数をエクスポートしていません`);
                continue;
            }

            const handler = typeof event === 'function' ? event : event.execute;
            const once = event.once ?? false;

            if (once) {
                client.once(eventName, (...args) => handler(...args, client));
            } else {
                client.on(eventName, (...args) => handler(...args, client));
            }

            console.log(`イベント '${eventName}' を読み込みました (${file})`);
        }
    }
}

async function load() {
    await connectDB();

    await loadCommands();
    await loadEvents();

    app.listen(5000, () => {
        console.log('Server listening on port 5000');
    });
}

load();

client.login(process.env.DISCORD_TOKEN)