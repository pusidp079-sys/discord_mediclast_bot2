require("dotenv").config();
const express = require("express");

const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
EmbedBuilder,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
Events
} = require("discord.js");

const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(10000, () => console.log("🌐 Web server running"));

/* ===== ENV ===== */

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const APPROVER_ROLE_ID = process.env.APPROVER_ROLE_ID;
const NOTIFY_ROLE_ID = process.env.NOTIFY_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

if (!TOKEN) {
console.log("❌ TOKEN not found in Environment Variables");
process.exit(1);
}

/* ===== CLIENT ===== */

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages
]
});

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ===== COMMAND ===== */

client.on(Events.InteractionCreate, async interaction => {

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "ลา") {

const modal = new ModalBuilder()
.setCustomId("leave_modal")
.setTitle("คำขอลา");

const start = new TextInputBuilder()
.setCustomId("start")
.setLabel("วันที่เริ่มลา")
.setStyle(TextInputStyle.Short);

const end = new TextInputBuilder()
.setCustomId("end")
.setLabel("วันที่สิ้นสุด")
.setStyle(TextInputStyle.Short);

const reason = new TextInputBuilder()
.setCustomId("reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(start),
new ActionRowBuilder().addComponents(end),
new ActionRowBuilder().addComponents(reason)
);

await interaction.showModal(modal);

}

}

/* ===== MODAL SUBMIT ===== */

if (interaction.isModalSubmit()) {

if (interaction.customId === "leave_modal") {

const start = interaction.fields.getTextInputValue("start");
const end = interaction.fields.getTextInputValue("end");
const reason = interaction.fields.getTextInputValue("reason");

const embed = new EmbedBuilder()
.setTitle("📄 คำขอลา")
.setDescription(
`👤 ผู้ยื่น: ${interaction.user}

📅 วันที่เริ่ม: ${start}
📅 วันที่สิ้นสุด: ${end}

📝 เหตุผล:
${reason}

⏳ สถานะ: รออนุมัติ`
)
.setColor(0x2b2d31)
.setTimestamp();

const buttons = new ActionRowBuilder().addComponents(
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

channel.send({
content: `<@&${NOTIFY_ROLE_ID}>`,
embeds: [embed],
components: [buttons]
});

await interaction.reply({
content: "✅ ส่งคำขอลาเรียบร้อย",
ephemeral: true
});

}

}

/* ===== BUTTON ===== */

if (interaction.isButton()) {

if (interaction.customId.startsWith("approve_") || interaction.customId.startsWith("reject_")) {

const hasRole = interaction.member.roles.cache.has(APPROVER_ROLE_ID);

if (!hasRole) {

return interaction.reply({
content: "❌ คุณไม่มีสิทธิ์อนุมัติ",
ephemeral: true
});

}

const embed = interaction.message.embeds[0];

if (!embed.description.includes("รออนุมัติ")) {

return interaction.reply({
content: "❌ รายการนี้ถูกดำเนินการแล้ว",
ephemeral: true
});

}

const userId = interaction.customId.split("_")[1];

const member = await interaction.guild.members.fetch(userId).catch(()=>null);

let statusText = "";
let color = 0x2b2d31;

if (interaction.customId.startsWith("approve_")) {

statusText = "✅ อนุมัติแล้ว";
color = 0x57F287;

} else {

statusText = "❌ ปฏิเสธ";
color = 0xED4245;

}

const newEmbed = EmbedBuilder.from(embed)
.setColor(color)
.setDescription(
embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`${statusText}
👮 ผู้อนุมัติ: ${interaction.user}`
)
);

await interaction.update({
embeds: [newEmbed],
components: []
});

/* ===== DM USER ===== */

if (member) {

try {

await member.send({
embeds: [
new EmbedBuilder()
.setTitle("ผลการพิจารณาคำขอลา")
.setDescription(
`สถานะ: ${statusText}
ผู้อนุมัติ: ${interaction.user}`
)
.setColor(color)
]
});

} catch {}

}

/* ===== LOG ===== */

if (LOG_CHANNEL_ID) {

const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);

if (logChannel) {

logChannel.send({
embeds: [
new EmbedBuilder()
.setTitle("📋 Log ระบบลา")
.setDescription(
`ผู้ยื่น: <@${userId}>
ผล: ${statusText}
ผู้อนุมัติ: ${interaction.user}`
)
.setColor(color)
.setTimestamp()
]
});

}

}

}

}

});

/* ===== LOGIN ===== */

client.login(TOKEN);
