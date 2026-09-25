import { Client, InteractionType, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { commands } from "../../cache/commands.js";

export async function execute(interaction: ChatInputCommandInteraction, client: Client) {
    if (interaction.type != InteractionType.ApplicationCommand) {
        return;
    }

    if (!interaction.guild) {
        await interaction.reply({
            flags: [MessageFlags.Ephemeral],
            content: "❌️DMではコマンドを実行できません。"
        })
        return;
    }

    const command = commands.get(interaction.commandName);
    if (!command) {
        await interaction.reply({
            flags: [MessageFlags.Ephemeral],
            content: "❌️コマンドが存在しません。"
        })
        return;
    }
    await command.execute(interaction);
}