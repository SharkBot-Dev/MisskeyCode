import { REST, Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath, pathToFileURL } from "url";

export async function sync() {
    dotenv.config();

    const commands: Array<RESTPostAPIChatInputApplicationCommandsJSONBody> = [];

    async function loadCommands(dir: string) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                await loadCommands(fullPath);
            } else if (file.endsWith(".js")) {
                try {
                    const modulePath = pathToFileURL(fullPath).href;
                    const commandModule = await import(modulePath);

                    if (commandModule.data && commandModule.execute) {
                        commands.push(commandModule.data.toJSON());
                    } else {
                        continue;
                    }
                } catch (err) {
                    console.error(`${file} の読み込み中にエラーが発生:`, err);
                }
            }
        }
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    await loadCommands(path.join(__dirname, "commands"));

    if (!process.env.DISCORD_TOKEN) throw new Error("DISCORD_TOKEN is not defined in environment variables.");
    if (!process.env.DISCORD_CLIENT_ID) throw new Error("DISCORD_CLIENT_ID is not defined in environment variables.");

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log(`${commands.length} 件のスラッシュコマンドを同期中...`);

        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
            { body: commands },
        );

        console.log("スラッシュコマンドを正常に同期しました。");
    } catch (error) {
        console.error("スラッシュコマンド同期中にエラーが発生:", error);
    }
}

sync();