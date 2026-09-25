import { ChatInputCommandInteraction, InteractionType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";

export const data = new SlashCommandBuilder().setName("instance").setDescription("このサーバーのデフォルトインスタンスを指定します。").addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const instance = interaction.options.getString("instance", true);

    const database = mongoClient.db('MisskeyCode');
    const collection = database.collection('Instance');

    await collection.updateOne({
        guildId: interaction.guildId
    }, {
        $set: {
            instance: instance
        }
    }, {
        upsert: true
    })

    await interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        content: "✅デフォルトインスタンスを指定しました。"
    })
}