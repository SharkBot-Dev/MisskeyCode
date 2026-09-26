import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import { defaultGuildInstance } from "../lib/instance.js";

export const data = new SlashCommandBuilder()
                    .setName("rp").
                    setDescription("Misskeyと連携が必要なロールパネルを作成します。")
                    .addRoleOption((option) => option.setName("role").setDescription("付与するロールを指定してください。").setRequired(true))
                    .addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(false))
                    .addStringOption((option) => option.setName("title").setDescription("ロールパネルのタイトルを指定してください。").setRequired(false))
                    .addStringOption((option) => option.setName("description").setDescription("ロールパネルの説明を指定してください。").setRequired(false))
                    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

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

    let title = interaction.options.getString("title", false);
    if (!title) {
        title = "ロールパネル"
    }

    let description = interaction.options.getString("description", false);
    if (!description) {
        description = "先にMisskeyと連携する必要があります。"
    }

    let role = interaction.options.getRole("role", true);

    const message = await interaction.channel.send({
        embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(Colors.Green).setFooter({
            text: `インスタンス: ${instance}`
        })],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel(role.name).setCustomId("rp_" + role.id).setStyle(ButtonStyle.Secondary))]
    })

    await mongoClient.db("MisskeyCode").collection("RolePanel").insertOne({
        messageId: message.id,
        instance: instance
    })

    await interaction.followUp({
        content: "✅ロールパネルを設置しました。",
        flags: [MessageFlags.Ephemeral]
    })
}