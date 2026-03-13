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
Events,
REST,
Routes,
SlashCommandBuilder
} = require("discord.js");

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(10000, () => console.log("🌐 Web server running"));

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const APPROVER_ROLE_ID = process.env.APPROVER_ROLE_ID;
const NOTIFY_ROLE_ID = process.env.NOTIFY_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ================= CLIENT ================= */

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */

const commands = [
new SlashCommandBuilder()
.setName("ลา")
.setDescription("ส่งคำขอลา"),

new SlashCommandBuilder()
.setName("panel")
.setDescription("สร้างแผงยื่นคำขอลา")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("✅ Slash command registered");
})();

/* ================= READY ================= */

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

try {

/* ===== COMMAND ===== */

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "panel") {

const embed = new EmbedBuilder()
.setTitle("📄 ระบบยื่นคำขอลา")
.setDescription("กดปุ่มด้านล่างเพื่อยื่นคำขอลา")
.setColor(0x2b2d31);

const button = new ButtonBuilder()
.setCustomId("leave_request")
.setLabel("ยื่นคำขอลา")
.setStyle(ButtonStyle.Primary);

await interaction.reply({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(button)]
});

}

if (interaction.commandName === "ลา") {
return interaction.showModal(createLeaveModal());
}

}

/* ===== BUTTON ===== */

if (interaction.isButton()) {

if (interaction.customId === "leave_request") {
return interaction.showModal(createLeaveModal());
}

/* ===== APPROVE / REJECT ===== */

if (interaction.customId.startsWith("approve_") || interaction.customId.startsWith("reject_")) {

if (!interaction.member.roles.cache.has(APPROVER_ROLE_ID)) {
return interaction.reply({ content: "❌ คุณไม่มีสิทธิ์", ephemeral: true });
}

const embed = interaction.message.embeds[0];

if (!embed.description.includes("รออนุมัติ")) {
return interaction.reply({ content: "❌ รายการนี้ถูกดำเนินการแล้ว", ephemeral: true });
}

const userId = interaction.customId.split("_")[1];

let status = "";
let color = 0x2b2d31;

if (interaction.customId.startsWith("approve_")) {
status = "✅ อนุมัติแล้ว";
color = 0x57F287;
} else {
status = "❌ ปฏิเสธ";
color = 0xED4245;
}

const newEmbed = EmbedBuilder.from(embed)
.setColor(color)
.setDescription(
embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`${status}
👮 ผู้อนุมัติ: ${interaction.user}`
)
);

await interaction.update({ embeds: [newEmbed], components: [] });

/* ===== DM USER ===== */

const member = await interaction.guild.members.fetch(userId).catch(()=>null);

if (member) {
try {
await member.send({
embeds: [
new EmbedBuilder()
.setTitle("ผลคำขอลา")
.setDescription(`สถานะ: ${status}\nผู้อนุมัติ: ${interaction.user}`)
.setColor(color)
]
});
} catch {}
}

/* ===== LOG ===== */

if (LOG_CHANNEL_ID) {

const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);

if (log) {
log.send({
embeds: [
new EmbedBuilder()
.setTitle("📋 Log ระบบลา")
.setDescription(
`ผู้ยื่น: <@${userId}>
ผล: ${status}
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

/* ===== MODAL SUBMIT ===== */

if (interaction.isModalSubmit()) {

if (interaction.customId === "leave_modal") {

const end = interaction.fields.getTextInputValue("end");
const reason = interaction.fields.getTextInputValue("reason");

/* วันที่เริ่ม = วันนี้ */

const startDate = new Date();

/* แปลงวันที่ */

const endDate = new Date(end);

if (isNaN(endDate)) {
return interaction.reply({
content: "❌ รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง 2026-03-20)",
ephemeral: true
});
}

const diffTime = endDate - startDate;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

if (diffDays < 0) {
return interaction.reply({
content: "❌ วันที่กลับมาต้องมากกว่าวันที่ปัจจุบัน",
ephemeral: true
});
}

/* EMBED */

const embed = new EmbedBuilder()
.setTitle("📄 คำขอลา")
.setDescription(
`👤 ผู้ยื่น: ${interaction.user}

📅 วันที่เริ่มลา: ${startDate.toLocaleDateString("th-TH")}
📅 วันที่กลับมา: ${end}

📊 จำนวนวันลา: ${diffDays} วัน

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

await channel.send({
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

} catch (err) {

console.error(err);

if (!interaction.replied) {
interaction.reply({
content: "❌ ระบบเกิดข้อผิดพลาด",
ephemeral: true
});
}

}

});

/* ================= MODAL ================= */

function createLeaveModal(){

const modal = new ModalBuilder()
.setCustomId("leave_modal")
.setTitle("คำขอลา");

const end = new TextInputBuilder()
.setCustomId("end")
.setLabel("วันที่กลับมา (ตัวอย่าง 2026-03-20)")
.setStyle(TextInputStyle.Short);

const reason = new TextInputBuilder()
.setCustomId("reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(end),
new ActionRowBuilder().addComponents(reason)
);

return modal;

}

client.login(TOKEN);require("dotenv").config();
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
Events,
REST,
Routes,
SlashCommandBuilder
} = require("discord.js");

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(10000, () => console.log("🌐 Web server running"));

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const APPROVER_ROLE_ID = process.env.APPROVER_ROLE_ID;
const NOTIFY_ROLE_ID = process.env.NOTIFY_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ================= CLIENT ================= */

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */

const commands = [
new SlashCommandBuilder()
.setName("ลา")
.setDescription("ส่งคำขอลา"),

new SlashCommandBuilder()
.setName("panel")
.setDescription("สร้างแผงยื่นคำขอลา")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("✅ Slash command registered");
})();

/* ================= READY ================= */

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

try {

/* ===== COMMAND ===== */

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "panel") {

const embed = new EmbedBuilder()
.setTitle("📄 ระบบยื่นคำขอลา")
.setDescription("กดปุ่มด้านล่างเพื่อยื่นคำขอลา")
.setColor(0x2b2d31);

const button = new ButtonBuilder()
.setCustomId("leave_request")
.setLabel("ยื่นคำขอลา")
.setStyle(ButtonStyle.Primary);

await interaction.reply({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(button)]
});

}

if (interaction.commandName === "ลา") {
return interaction.showModal(createLeaveModal());
}

}

/* ===== BUTTON ===== */

if (interaction.isButton()) {

if (interaction.customId === "leave_request") {
return interaction.showModal(createLeaveModal());
}

/* ===== APPROVE / REJECT ===== */

if (interaction.customId.startsWith("approve_") || interaction.customId.startsWith("reject_")) {

if (!interaction.member.roles.cache.has(APPROVER_ROLE_ID)) {
return interaction.reply({ content: "❌ คุณไม่มีสิทธิ์", ephemeral: true });
}

const embed = interaction.message.embeds[0];

if (!embed.description.includes("รออนุมัติ")) {
return interaction.reply({ content: "❌ รายการนี้ถูกดำเนินการแล้ว", ephemeral: true });
}

const userId = interaction.customId.split("_")[1];

let status = "";
let color = 0x2b2d31;

if (interaction.customId.startsWith("approve_")) {
status = "✅ อนุมัติแล้ว";
color = 0x57F287;
} else {
status = "❌ ปฏิเสธ";
color = 0xED4245;
}

const newEmbed = EmbedBuilder.from(embed)
.setColor(color)
.setDescription(
embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`${status}
👮 ผู้อนุมัติ: ${interaction.user}`
)
);

await interaction.update({ embeds: [newEmbed], components: [] });

/* ===== DM USER ===== */

const member = await interaction.guild.members.fetch(userId).catch(()=>null);

if (member) {
try {
await member.send({
embeds: [
new EmbedBuilder()
.setTitle("ผลคำขอลา")
.setDescription(`สถานะ: ${status}\nผู้อนุมัติ: ${interaction.user}`)
.setColor(color)
]
});
} catch {}
}

/* ===== LOG ===== */

if (LOG_CHANNEL_ID) {

const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);

if (log) {
log.send({
embeds: [
new EmbedBuilder()
.setTitle("📋 Log ระบบลา")
.setDescription(
`ผู้ยื่น: <@${userId}>
ผล: ${status}
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

/* ===== MODAL SUBMIT ===== */

if (interaction.isModalSubmit()) {

if (interaction.customId === "leave_modal") {

const end = interaction.fields.getTextInputValue("end");
const reason = interaction.fields.getTextInputValue("reason");

/* วันที่เริ่ม = วันนี้ */

const startDate = new Date();

/* แปลงวันที่ */

const endDate = new Date(end);

if (isNaN(endDate)) {
return interaction.reply({
content: "❌ รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง 2026-03-20)",
ephemeral: true
});
}

const diffTime = endDate - startDate;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

if (diffDays < 0) {
return interaction.reply({
content: "❌ วันที่กลับมาต้องมากกว่าวันที่ปัจจุบัน",
ephemeral: true
});
}

/* EMBED */

const embed = new EmbedBuilder()
.setTitle("📄 คำขอลา")
.setDescription(
`👤 ผู้ยื่น: ${interaction.user}

📅 วันที่เริ่มลา: ${startDate.toLocaleDateString("th-TH")}
📅 วันที่กลับมา: ${end}

📊 จำนวนวันลา: ${diffDays} วัน

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

await channel.send({
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

} catch (err) {

console.error(err);

if (!interaction.replied) {
interaction.reply({
content: "❌ ระบบเกิดข้อผิดพลาด",
ephemeral: true
});
}

}

});

/* ================= MODAL ================= */

function createLeaveModal(){

const modal = new ModalBuilder()
.setCustomId("leave_modal")
.setTitle("คำขอลา");

const end = new TextInputBuilder()
.setCustomId("end")
.setLabel("วันที่กลับมา (ตัวอย่าง 2026-03-20)")
.setStyle(TextInputStyle.Short);

const reason = new TextInputBuilder()
.setCustomId("reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(end),
new ActionRowBuilder().addComponents(reason)
);

return modal;

}

client.login(TOKEN);require("dotenv").config();
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
Events,
REST,
Routes,
SlashCommandBuilder
} = require("discord.js");

/* ================= WEB SERVER ================= */

const app = express();
app.get("/", (req, res) => res.send("Bot running"));
app.listen(10000, () => console.log("🌐 Web server running"));

/* ================= ENV ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const APPROVER_ROLE_ID = process.env.APPROVER_ROLE_ID;
const NOTIFY_ROLE_ID = process.env.NOTIFY_ROLE_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/* ================= CLIENT ================= */

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */

const commands = [
new SlashCommandBuilder()
.setName("ลา")
.setDescription("ส่งคำขอลา"),

new SlashCommandBuilder()
.setName("panel")
.setDescription("สร้างแผงยื่นคำขอลา")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("✅ Slash command registered");
})();

/* ================= READY ================= */

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

try {

/* ===== COMMAND ===== */

if (interaction.isChatInputCommand()) {

if (interaction.commandName === "panel") {

const embed = new EmbedBuilder()
.setTitle("📄 ระบบยื่นคำขอลา")
.setDescription("กดปุ่มด้านล่างเพื่อยื่นคำขอลา")
.setColor(0x2b2d31);

const button = new ButtonBuilder()
.setCustomId("leave_request")
.setLabel("ยื่นคำขอลา")
.setStyle(ButtonStyle.Primary);

await interaction.reply({
embeds: [embed],
components: [new ActionRowBuilder().addComponents(button)]
});

}

if (interaction.commandName === "ลา") {
return interaction.showModal(createLeaveModal());
}

}

/* ===== BUTTON ===== */

if (interaction.isButton()) {

if (interaction.customId === "leave_request") {
return interaction.showModal(createLeaveModal());
}

/* ===== APPROVE / REJECT ===== */

if (interaction.customId.startsWith("approve_") || interaction.customId.startsWith("reject_")) {

if (!interaction.member.roles.cache.has(APPROVER_ROLE_ID)) {
return interaction.reply({ content: "❌ คุณไม่มีสิทธิ์", ephemeral: true });
}

const embed = interaction.message.embeds[0];

if (!embed.description.includes("รออนุมัติ")) {
return interaction.reply({ content: "❌ รายการนี้ถูกดำเนินการแล้ว", ephemeral: true });
}

const userId = interaction.customId.split("_")[1];

let status = "";
let color = 0x2b2d31;

if (interaction.customId.startsWith("approve_")) {
status = "✅ อนุมัติแล้ว";
color = 0x57F287;
} else {
status = "❌ ปฏิเสธ";
color = 0xED4245;
}

const newEmbed = EmbedBuilder.from(embed)
.setColor(color)
.setDescription(
embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`${status}
👮 ผู้อนุมัติ: ${interaction.user}`
)
);

await interaction.update({ embeds: [newEmbed], components: [] });

/* ===== DM USER ===== */

const member = await interaction.guild.members.fetch(userId).catch(()=>null);

if (member) {
try {
await member.send({
embeds: [
new EmbedBuilder()
.setTitle("ผลคำขอลา")
.setDescription(`สถานะ: ${status}\nผู้อนุมัติ: ${interaction.user}`)
.setColor(color)
]
});
} catch {}
}

/* ===== LOG ===== */

if (LOG_CHANNEL_ID) {

const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);

if (log) {
log.send({
embeds: [
new EmbedBuilder()
.setTitle("📋 Log ระบบลา")
.setDescription(
`ผู้ยื่น: <@${userId}>
ผล: ${status}
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

/* ===== MODAL SUBMIT ===== */

if (interaction.isModalSubmit()) {

if (interaction.customId === "leave_modal") {

const end = interaction.fields.getTextInputValue("end");
const reason = interaction.fields.getTextInputValue("reason");

/* วันที่เริ่ม = วันนี้ */

const startDate = new Date();

/* แปลงวันที่ */

const endDate = new Date(end);

if (isNaN(endDate)) {
return interaction.reply({
content: "❌ รูปแบบวันที่ไม่ถูกต้อง (ตัวอย่าง 2026-03-20)",
ephemeral: true
});
}

const diffTime = endDate - startDate;
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

if (diffDays < 0) {
return interaction.reply({
content: "❌ วันที่กลับมาต้องมากกว่าวันที่ปัจจุบัน",
ephemeral: true
});
}

/* EMBED */

const embed = new EmbedBuilder()
.setTitle("📄 คำขอลา")
.setDescription(
`👤 ผู้ยื่น: ${interaction.user}

📅 วันที่เริ่มลา: ${startDate.toLocaleDateString("th-TH")}
📅 วันที่กลับมา: ${end}

📊 จำนวนวันลา: ${diffDays} วัน

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

await channel.send({
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

} catch (err) {

console.error(err);

if (!interaction.replied) {
interaction.reply({
content: "❌ ระบบเกิดข้อผิดพลาด",
ephemeral: true
});
}

}

});

/* ================= MODAL ================= */

function createLeaveModal(){

const modal = new ModalBuilder()
.setCustomId("leave_modal")
.setTitle("คำขอลา");

const end = new TextInputBuilder()
.setCustomId("end")
.setLabel("วันที่กลับมา (ตัวอย่าง 2026-03-20)")
.setStyle(TextInputStyle.Short);

const reason = new TextInputBuilder()
.setCustomId("reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(end),
new ActionRowBuilder().addComponents(reason)
);

return modal;

}

client.login(TOKEN);
