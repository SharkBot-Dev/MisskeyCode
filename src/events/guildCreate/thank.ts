import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Client, Colors, Guild, InteractionType, MessageFlags, PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

export async function execute(guild: Guild, client: Client) {
    console.log(`${guild.name} (${guild.id})に参加しました。`);

    let find = 0;

    guild.channels.cache.map((channel) => {
      if (find === 0) {
        if (
          guild.members.me &&
          channel.type === ChannelType.GuildText &&
          guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.ViewChannel) &&
          guild.members.me.permissionsIn(channel).has(PermissionFlagsBits.SendMessages)
        ) {
          channel
            .send({
              embeds: [
                {
                  color: Colors.Green,
                  title: "やっほー！導入完了！",
                  description:
                    "MisskeyCodeを導入してくれてありがとう！\nこのBotはMisskeyとDiscordを連携し、\nロール付与などができる便利なBotだよ！\n\nこのBotの使用には、\nMisskeyアカウントと連携する必要があります。\n`/login`でインスタンスを指定して、\n最初の連携を開始してください。",
                },
              ],
              components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                  new ButtonBuilder()
                    .setLabel("サポートサーバー")
                    .setURL("https://discord.gg/8gkWBzhwBB")
                    .setStyle(ButtonStyle.Link),
                  new ButtonBuilder()
                    .setLabel("利用規約")
                    .setURL("https://misskey-auth.sharkbot.xyz/terms")
                    .setStyle(ButtonStyle.Link),
                  new ButtonBuilder()
                    .setLabel("プライバシーポリシー")
                    .setURL("https://misskey-auth.sharkbot.xyz/privacy")
                    .setStyle(ButtonStyle.Link),
                ),
              ],
            })
            .catch(() => {});

          return (find = 1);
        }
      }
    });
}