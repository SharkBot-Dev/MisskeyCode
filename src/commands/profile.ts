import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import { decryptToken } from "../lib/encrypt.js";

export const data = new SlashCommandBuilder()
                    .setName("profile").
                    setDescription("Misskeyのプロフィールを取得します。")
                    .addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(true))
                    .addUserOption((option) => option.setName("user").setDescription("Discordのユーザーを指定してください。").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    await interaction.deferReply();

    const instance = interaction.options.getString("instance", true);
    let user = interaction.options.getUser("user", false);
    if (!user) {
        user = interaction.user
    }

    const database = await mongoClient.db("MisskeyCode").collection("LoginCode").findOne({
        discordUserId: user.id,
        instance: instance
    })

    if (!database) {
        await interaction.followUp({
            content: "❌️`/login`から連携する必要があります。"
        })
        return;
    }

    const accessToken = decryptToken(database.accessToken);

    const userInfoRes = await fetch(`https://${instance}/api/i`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
    });

    if (userInfoRes.status != 200) {
        await interaction.followUp({
            content: "❌️`/login`から連携する必要があります。"
        })
        return;
    }

    const userInfo = await userInfoRes.json();

    const embed = new EmbedBuilder().setTitle(userInfo.username).setDescription(userInfo.description).setColor(Colors.Green);
    if (userInfo.avatarUrl) {
        embed.setThumbnail(userInfo.avatarUrl)
    }
    embed.setFooter({
        text: userInfo.id
    })

    await interaction.followUp({
        embeds: [embed]
    })
}