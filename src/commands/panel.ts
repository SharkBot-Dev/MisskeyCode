import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import { defaultGuildInstance } from "../lib/instance.js";
import { isValidDomain } from "../lib/domain.js";

export const data = new SlashCommandBuilder().setName("panel").setDescription("MisskeyとDiscordを連携するパネルを設置します。").addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(false)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    if (!interaction.guildId) return;

    if (interaction.channel?.type != ChannelType.GuildText) {
        await interaction.reply({
            flags: [MessageFlags.Ephemeral],
            content: "❌️テキストチャンネルで実行してください。"
        })
        return;
    }

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

    if (!isValidDomain(instance)) {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️インスタンスのドメインがおかしいです。\n\n-# 例: `misskey.io`、`example.com`"
        })
        return;
    }

    const message = await interaction.channel.send({
        embeds: [new EmbedBuilder().setTitle("Misskeyと連携する").setDescription("以下のボタンから連携を開始できます。").setColor(Colors.Green).setFooter({
            text: `インスタンス: ${instance}`
        })],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel("連携開始").setCustomId("login_button").setStyle(ButtonStyle.Primary))]
    })

    const database = mongoClient.db('MisskeyCode');
    const collection = database.collection('LoginPanel');

    await collection.insertOne({
        messageId: message.id,
        instance: instance
    })

    await interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        content: "✅設置しました。"
    })
}