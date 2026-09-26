import { Client, Guild } from "discord.js";
import { mongoClient } from "../../session.js";

export async function execute(guild: Guild, client: Client) {
    console.log(`${guild.name} (${guild.id})から退出しました。`);

    const database = mongoClient.db('MisskeyCode');

    // インスタンス
    await database.collection('Instance').deleteOne({
        guildId: guild.id
    })
}