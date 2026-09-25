import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import crypto from "node:crypto";
import { loginSession } from "../cache/session.js";
import { oauth2Cache } from "../cache/instance.js";
import { defaultGuildInstance } from "../lib/instance.js";

export const data = new SlashCommandBuilder().setName("logout").setDescription("Misskeyと連携を解除します。").addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    if (!interaction.guildId) return;

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    let instance = interaction.options.getString("instance", false);
    if (!instance) {
        instance = await defaultGuildInstance(interaction.guildId);
        if (!instance) {
            await interaction.followUp({
                flags: [MessageFlags.Ephemeral],
                content: "❌️インスタンスが指定されていません。"
            })
            return;
        }
    }

    const collection = mongoClient.db("MisskeyCode").collection("LoginCode");

    const database = await collection.findOne({
        discordUserId: interaction.user.id,
        instance: instance
    })
    if (!database) {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️まだログインしていません。"
        })
        return;
    }

    await collection.deleteOne({
        discordUserId: interaction.user.id,
        instance: instance
    })

    await interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        content: "✅ログアウトが完了しました。"
    })
}