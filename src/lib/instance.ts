import { mongoClient } from "../session.js";

export async function defaultGuildInstance(guildId: string) {
    const database = mongoClient.db('MisskeyCode');
    const collection = database.collection('Instance');

    const instance = await collection.findOne({
        guildId: guildId
    })

    if (!instance) {
        return null;
    }

    return instance.instance
}