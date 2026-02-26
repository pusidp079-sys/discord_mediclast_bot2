require('dotenv').config();

const {
  Client, GatewayIntentBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  EmbedBuilder, Events, REST, Routes, SlashCommandBuilder
} = require('discord.js');

const {
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  TARGET_CHANNEL_ID,
  APPROVER_ROLE_ID
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= REGISTER COMMAND ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("panel")
    .setDescription("เปิดแผงยื่นคำขอลา"),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log("Slash command ready");
})();

client.once(Events.ClientReady, () => {
  console.log(`Bot online: ${client.user.tag}`);
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {
  try {

    /* ===== PANEL ===== */
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: "📄 แบบฟอร์มยื่นคำลาเวลา",
          iconURL: interaction.guild.iconURL()
        })
        .setDescription("กดปุ่มด้านล่างเพื่อยื่นคำลาเวลา\n━━━━━━━━━━━━━━━━━━");

      const btn = new ButtonBuilder()
        .setCustomId("leave_request")
        .setLabel("ยื่นคำลาเวลา")
        .setStyle(ButtonStyle.Primary);

      return interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(btn)]
      });
    }

    /* ===== OPEN FORM ===== */
    if (interaction.isButton() && interaction.customId === "leave_request") {

      const modal = new ModalBuilder()
        .setCustomId("leave_form")
        .setTitle("แบบฟอร์มคำขอลา");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("date")
            .setLabel("วันที่ลา")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("return")
            .setLabel("วันที่กลับมา")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("เหตุผล")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    /* ===== SUBMIT FORM ===== */
    if (interaction.isModalSubmit() && interaction.customId === "leave_form") {

      await interaction.deferReply({ ephemeral: true });

      const date = interaction.fields.getTextInputValue("date");
      const returnDate = interaction.fields.getTextInputValue("return");
      const reason = interaction.fields.getTextInputValue("reason");

      const embed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: "📄 แบบฟอร์มคำขอลา",
          iconURL: interaction.user.displayAvatarURL()
        })
        .setDescription(
`━━━━━━━━━━━━━━━━━━
👤 ผู้ยื่น : <@${interaction.user.id}>

📅 วันที่ : ${date}
📅 วันที่กลับมา : ${returnDate}

📝 เหตุผล :
${reason}

━━━━━━━━━━━━━━━━━━
⏳ สถานะ : รอการอนุมัติ`
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`approve_${interaction.user.id}`)
          .setLabel("อนุมัติ")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`reject_${interaction.user.id}`)
          .setLabel("ปฏิเสธ")
          .setStyle(ButtonStyle.Danger)
      );

      const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
      await channel.send({ embeds: [embed], components: [row] });

      return interaction.editReply({ content: "✅ ส่งคำขอแล้ว" });
    }

    /* ===== APPROVE ===== */
    if (interaction.isButton() && interaction.customId.startsWith("approve_")) {

      await interaction.deferReply({ ephemeral: true });

      if (!interaction.member.roles.cache.has(APPROVER_ROLE_ID)) {
        return interaction.editReply({ content: "❌ ไม่มีสิทธิ์" });
      }

      const userId = interaction.customId.split("_")[1];

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(0xffffff)
        .setDescription(
interaction.message.embeds[0].description.replace(
"⏳ สถานะ : รอการอนุมัติ",
`✅ สถานะ : อนุมัติแล้ว
👮 โดย : ${interaction.user.tag}`
));

      await interaction.message.edit({ embeds: [embed], components: [] });

      try {
        const user = await client.users.fetch(userId);
        await user.send("✅ คำขอลาของคุณได้รับการอนุมัติแล้ว");
      } catch {}

      return interaction.editReply({ content: "อนุมัติแล้ว" });
    }

    /* ===== REJECT ===== */
    if (interaction.isButton() && interaction.customId.startsWith("reject_")) {

      if (!interaction.member.roles.cache.has(APPROVER_ROLE_ID)) {
        return interaction.reply({ content: "❌ ไม่มีสิทธิ์", ephemeral: true });
      }

      const userId = interaction.customId.split("_")[1];

      const modal = new ModalBuilder()
        .setCustomId(`reject_reason_${interaction.message.id}_${userId}`)
        .setTitle("เหตุผลการปฏิเสธ");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("เหตุผล")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    /* ===== SUBMIT REJECT ===== */
    if (interaction.isModalSubmit() && interaction.customId.startsWith("reject_reason_")) {

      await interaction.deferReply({ ephemeral: true });

      const reason = interaction.fields.getTextInputValue("reason");

      const parts = interaction.customId.split("_");
      const msgId = parts[2];
      const userId = parts[3];

      const msg = await interaction.channel.messages.fetch(msgId);

      const embed = EmbedBuilder.from(msg.embeds[0])
        .setColor(0x000000)
        .setDescription(
msg.embeds[0].description.replace(
"⏳ สถานะ : รอการอนุมัติ",
`❌ สถานะ : ปฏิเสธ
👮 โดย : ${interaction.user.tag}
📌 เหตุผล : ${reason}`
));

      await msg.edit({ embeds: [embed], components: [] });

      try {
        const user = await client.users.fetch(userId);
        await user.send(`❌ คำขอลาของคุณถูกปฏิเสธ\nเหตุผล: ${reason}`);
      } catch {}

      return interaction.editReply({ content: "ปฏิเสธแล้ว" });
    }

  } catch (err) {
    console.error(err);
  }
});

const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is alive"));
app.get("/health", (req, res) => res.send("OK"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server ready");
});


client.login(TOKEN);
