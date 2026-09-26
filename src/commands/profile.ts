import { ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import { decryptToken } from "../lib/encrypt.js";
import { defaultGuildInstance } from "../lib/instance.js";
import { isValidDomain } from "../lib/domain.js";

export const data = new SlashCommandBuilder()
                    .setName("profile").
                    setDescription("Misskeyのプロフィールを取得します。")
                    .addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(false))
                    .addUserOption((option) => option.setName("user").setDescription("Discordのユーザーを指定してください。").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    if (!interaction.guildId) return;

    await interaction.deferReply();

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

    try {
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
        if (userInfo.bannerUrl) {
            embed.setImage(userInfo.bannerUrl)
        }
        embed.setFooter({
            text: userInfo.id
        })
        embed.addFields({
            name: "その他の情報",
            value: `
    アカウント作成日: ${userInfo.createdAt}
    `
        })

        await interaction.followUp({
            embeds: [embed]
        })
    } catch {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️不明なエラーが発生しました。"
        })
        return;
    }
}