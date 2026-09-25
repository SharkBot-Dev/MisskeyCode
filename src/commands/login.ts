import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, InteractionType, MessageFlags, SlashCommandBuilder } from "discord.js";
import { mongoClient } from "../session.js";
import crypto from "node:crypto";
import { loginSession } from "../cache/session.js";
import { oauth2Cache } from "../cache/instance.js";

export const data = new SlashCommandBuilder().setName("login").setDescription("Misskeyと連携を開始します。").addStringOption((option) => option.setName("instance").setDescription("Misskeyのインスタンスを指定してください。").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const instance = interaction.options.getString("instance", true);

    let oauth2CacheData = oauth2Cache.get(instance);
    if (!oauth2CacheData) {
        const server = await fetch(`https://${instance}/.well-known/oauth-authorization-server`);
        oauth2CacheData = await server.json();
    }

    const codeVerifier = crypto.randomBytes(64).toString("base64url");

    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const state = crypto.randomUUID();

    // Misskey stores the URL-serialized client ID (including a root trailing slash).
    const clientId = new URL(process.env.CLIENT_ID as string).href;
    const redirectUri = process.env.REDIRECT_URI as string;
    const scope = process.env.SCOPE as string;

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
    });

    const authorizeUrl =
        `${oauth2CacheData.authorization_endpoint}?${params.toString()}`;

    loginSession.set(state, {
        host: instance,
        state,
        codeVerifier,
        codeChallenge,

        clientId,
        redirectUri,
        scope,

        tokenEndpoint: oauth2CacheData.token_endpoint,

        discordUserId: interaction.user.id,
        discordGuildId: interaction.guildId,

        instance: instance
    });

    await interaction.followUp({
        flags: [MessageFlags.Ephemeral],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setLabel("Misskeyを開く").setURL(authorizeUrl).setStyle(ButtonStyle.Link))],
        embeds: [new EmbedBuilder().setTitle("連携を行う").setDescription("連携を行うには、以下のMisskeyを開くを押してください。").setColor(Colors.Blue)]
    })
}