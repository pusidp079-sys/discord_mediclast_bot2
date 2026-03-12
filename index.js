require('dotenv').config();

/* ===== Render keep alive ===== */
const express = require("express");
const app = express();

app.get("/", (req, res) => {
res.send("Bot is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log("Web server running on port " + PORT);
});
/* ============================= */

const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
EmbedBuilder,
Events,
REST,
Routes,
SlashCommandBuilder,
StringSelectMenuBuilder
} = require('discord.js');

const {
TOKEN,
CLIENT_ID,
GUILD_ID,
TARGET_CHANNEL_ID,
APPROVER_ROLE_ID,
NOTIFY_ROLE_ID
} = process.env;

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

/* ===== Slash Command ===== */

const commands = [
new SlashCommandBuilder()
.setName("panel")
.setDescription("เปิดแผงยื่นคำขอลา"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
if (!CLIENT_ID || !GUILD_ID) return;

await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
}

/* ===== Memory ===== */

const leaveState = new Map();

/* ===== Helpers ===== */

function thaiDate(date) {
return date.toLocaleDateString("th-TH", {
year: "numeric",
month: "long",
day: "numeric"
});
}

function countDays(start, end) {
const diff = end - start;
return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

/* ===== Bot Ready ===== */

client.once(Events.ClientReady, async () => {
console.log(`Online: ${client.user.tag}`);
await registerCommands();
});

/* ===== Interaction ===== */

client.on(Events.InteractionCreate, async interaction => {

try {

```
/* PANEL COMMAND */

if (interaction.isChatInputCommand() && interaction.commandName === "panel") {

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("📄 แบบฟอร์มยื่นคำขอลา")
    .setDescription("กดปุ่มด้านล่างเพื่อยื่นคำขอลา");

  const btn = new ButtonBuilder()
    .setCustomId("leave_request")
    .setLabel("ยื่นคำขอลา")
    .setStyle(ButtonStyle.Primary);

  return interaction.reply({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(btn)]
  });
}

/* BUTTON */

if (interaction.isButton() && interaction.customId === "leave_request") {

  leaveState.set(interaction.user.id, {});

  const yearMenu = new StringSelectMenuBuilder()
    .setCustomId("year")
    .setPlaceholder("เลือกปี")
    .addOptions(
      Array.from({ length: 5 }, (_, i) => {
        const y = new Date().getFullYear() + i + 543;
        return {
          label: String(y),
          value: String(y - 543)
        };
      })
    );

  return interaction.reply({
    content: "เลือกปีที่จะกลับมา",
    components: [new ActionRowBuilder().addComponents(yearMenu)],
    ephemeral: true
  });
}

/* SELECT MENU */

if (interaction.isStringSelectMenu()) {

  const state = leaveState.get(interaction.user.id) || {};
  const value = interaction.values[0];

  /* YEAR */

  if (interaction.customId === "year") {

    state.year = Number(value);

    const monthMenu = new StringSelectMenuBuilder()
      .setCustomId("month")
      .setPlaceholder("เลือกเดือน")
      .addOptions(
        Array.from({ length: 12 }, (_, i) => ({
          label: new Date(2000, i).toLocaleString("th-TH", { month: "long" }),
          value: String(i)
        }))
      );

    leaveState.set(interaction.user.id, state);

    return interaction.update({
      content: "เลือกเดือน",
      components: [new ActionRowBuilder().addComponents(monthMenu)]
    });
  }

  /* MONTH */

  if (interaction.customId === "month") {

    state.month = Number(value);
    const days = new Date(state.year, state.month + 1, 0).getDate();

    const ranges = [];

    for (let i = 1; i <= days; i += 25) {

      const end = Math.min(i + 24, days);

      ranges.push({
        label: `วันที่ ${i} - ${end}`,
        value: `${i}-${end}`
      });
    }

    const rangeMenu = new StringSelectMenuBuilder()
      .setCustomId("day_range")
      .setPlaceholder("เลือกช่วงวัน")
      .addOptions(ranges);

    leaveState.set(interaction.user.id, state);

    return interaction.update({
      content: "เลือกช่วงวัน",
      components: [new ActionRowBuilder().addComponents(rangeMenu)]
    });
  }

  /* DAY RANGE */

  if (interaction.customId === "day_range") {

    const [start, end] = value.split("-").map(Number);

    const dayMenu = new StringSelectMenuBuilder()
      .setCustomId("day")
      .setPlaceholder("เลือกวัน")
      .addOptions(
        Array.from({ length: end - start + 1 }, (_, i) => {
          const day = start + i;
          return {
            label: String(day),
            value: String(day)
          };
        })
      );

    return interaction.update({
      content: "เลือกวันจะกลับเข้าเวร",
      components: [new ActionRowBuilder().addComponents(dayMenu)]
    });
  }

  /* DAY */

  if (interaction.customId === "day") {

    state.day = Number(value);
    leaveState.set(interaction.user.id, state);

    const modal = new ModalBuilder()
      .setCustomId("reason_modal")
      .setTitle("กรอกเหตุผลการลา");

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
}

/* MODAL SUBMIT */

if (interaction.isModalSubmit() && interaction.customId === "reason_modal") {

  const state = leaveState.get(interaction.user.id);
  const reason = interaction.fields.getTextInputValue("reason");

  const startDate = new Date();
  const returnDate = new Date(state.year, state.month, state.day);

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setTitle("📄 คำขอลา")
    .setDescription(
```

`👤 ผู้ยื่น: <@${interaction.user.id}>

📅 วันที่ยื่น: ${thaiDate(startDate)}
📅 วันที่กลับมา: ${thaiDate(returnDate)}
📆 จำนวนวันที่ลา: ${countDays(startDate, returnDate)} วัน

📝 เหตุผล:
${reason}

⏳ สถานะ: รออนุมัติ`
)
.setTimestamp();

```
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

  await channel.send({
    content: NOTIFY_ROLE_ID ? `<@&${NOTIFY_ROLE_ID}>` : undefined,
    embeds: [embed],
    components: [row]
  });

  leaveState.delete(interaction.user.id);

  return interaction.reply({
    content: "ส่งคำขอแล้ว",
    ephemeral: true
  });
}
```

} catch (err) {

```
console.error(err);

if (interaction.replied || interaction.deferred) {
  interaction.editReply({ content: "เกิดข้อผิดพลาด" });
} else {
  interaction.reply({ content: "เกิดข้อผิดพลาด", ephemeral: true });
}
```

}

});

/* ===== Error Protection ===== */

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ============================ */

client.login(TOKEN);
