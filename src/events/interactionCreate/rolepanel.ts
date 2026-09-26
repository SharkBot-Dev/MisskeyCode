import { ButtonInteraction, Client, InteractionType, MessageFlags } from "discord.js";
import { mongoClient } from "../../session.js";
import { decryptToken } from "../../lib/encrypt.js";

export async function execute(interaction: ButtonInteraction, client: Client) {
    if (interaction.type != InteractionType.MessageComponent) {
        return;
    }

    const customId = interaction.customId
    if (!customId.startsWith("rp_")) {
        return;
    }

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const message = await mongoClient.db("MisskeyCode").collection("RolePanel").findOne({
        messageId: interaction.message.id
    })

    if (!message) {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️不明なロールパネル"
        })
        return;
    }

    const database = await mongoClient.db("MisskeyCode").collection("LoginCode").findOne({
        discordUserId: interaction.user.id,
        instance: message.instance
    })

    if (!database) {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️`/login`から連携する必要があります。"
        })
        return;
    }

    const accessToken = decryptToken(database.accessToken);

    try {
        const userInfoRes = await fetch(`https://${message.instance}/api/i`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        });

        if (userInfoRes.status != 200) {
            await interaction.followUp({
                flags: [MessageFlags.Ephemeral],
                content: "❌️`/login`から連携する必要があります。"
            })
            return;
        }

        const roleId = customId.split("_")[1];
        if (!roleId) {
            await interaction.followUp({
                flags: [MessageFlags.Ephemeral],
                content: "❌️不明なロール"
            })
            return;
        }

        const member = await interaction.guild?.members.fetch(interaction.user.id);

        if (member?.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.followUp({
                flags: [MessageFlags.Ephemeral],
                content: `✅ <@&${roleId}>を剥奪しました。`
            })
        } else {
            await member?.roles.add(roleId);
            await interaction.followUp({
                flags: [MessageFlags.Ephemeral],
                content: `✅ <@&${roleId}>を追加しました。`
            })
        }
    } catch {
        await interaction.followUp({
            flags: [MessageFlags.Ephemeral],
            content: "❌️不明なエラーが発生しました。"
        })
        return;
    }
}