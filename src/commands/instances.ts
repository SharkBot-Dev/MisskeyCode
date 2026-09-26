import { ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";

export const data = new SlashCommandBuilder().setName("instances").setDescription("自分のMisskeyアカウントのインスタンス一覧を表示します。");

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const database = mongoClient.db('MisskeyCode');
    const collection = database.collection("LoginCode")

    const instances = await collection.find({
        discordUserId: interaction.user.id,
    }).toArray();

    const embed = new EmbedBuilder().setTitle("あなたのMisskeyインスタンス一覧");
    let description = ""
    for (const i of instances) {
        description += `${i.instance}\n`
    }
    embed.setDescription(description);
    embed.setColor(Colors.Green)

    await interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        embeds: [embed]
    })
}