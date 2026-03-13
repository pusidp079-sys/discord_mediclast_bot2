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

const { google } = require("googleapis");

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

/* ================= GOOGLE SHEETS ================= */

const auth = new google.auth.GoogleAuth({
keyFile: "google-key.json",
scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({
version: "v4",
auth
});

const SPREADSHEET_ID = "1q2JM4dStTp2rF0ztiA_eZA5oMz9e0Q_3hdHiv8wRZlY";

/* ================= CLIENT ================= */

const client = new Client({
intents: [GatewayIntentBits.Guilds]
});

/* ================= COMMAND ================= */

const commands = [

new SlashCommandBuilder()
.setName("panel")
.setDescription("สร้างแผงยื่นคำขอลา"),

new SlashCommandBuilder()
.setName("leave-list")
.setDescription("ดูรายการลาทั้งหมด")

].map(cmd => cmd.toJSON());

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

/* ================= FUNCTIONS ================= */

function calculateLeaveDays(start,end){

const startDate = new Date(start);
const endDate = new Date(end);

if(isNaN(startDate) || isNaN(endDate)) return null;

const diff = endDate - startDate;

return diff/(1000*60*60*24)+1;

}

async function saveLeave(user,start,end,days,reason,status){

await sheets.spreadsheets.values.append({

spreadsheetId: SPREADSHEET_ID,

range:"Sheet1!A:F",

valueInputOption:"USER_ENTERED",

requestBody:{
values:[[user,start,end,days,reason,status]]
}

});

}

async function getLeaves(){

const res = await sheets.spreadsheets.values.get({

spreadsheetId:SPREADSHEET_ID,

range:"Sheet1!A:F"

});

return res.data.values || [];

}

/* ================= INTERACTION ================= */

client.on(Events.InteractionCreate, async interaction => {

try{

/* ===== COMMAND ===== */

if(interaction.isChatInputCommand()){

if(interaction.commandName==="panel"){

const embed=new EmbedBuilder()
.setTitle("📄 ระบบยื่นคำขอลา")
.setDescription("กดปุ่มด้านล่างเพื่อยื่นคำขอลา")
.setColor(0x2b2d31);

const button=new ButtonBuilder()
.setCustomId("leave_request")
.setLabel("ยื่นคำขอลา")
.setStyle(ButtonStyle.Primary);

const row=new ActionRowBuilder().addComponents(button);

return interaction.reply({
embeds:[embed],
components:[row]
});

}

/* ===== LEAVE LIST ===== */

if(interaction.commandName==="leave-list"){

const rows=await getLeaves();

if(rows.length<=1){

return interaction.reply({
content:"❌ ยังไม่มีข้อมูล",
ephemeral:true
});

}

let text="";

rows.slice(1).forEach((r,i)=>{

text+=`${i+1}. <@${r[0]}>
📅 ${r[1]} → ${r[2]}
📆 ${r[3]} วัน
📄 ${r[4]}
📌 ${r[5]}

`;

});

const embed=new EmbedBuilder()
.setTitle("📋 รายการลาทั้งหมด")
.setDescription(text)
.setColor(0x2b2d31);

return interaction.reply({embeds:[embed]});

}

}

/* ===== BUTTON ===== */

if(interaction.isButton()){

if(interaction.customId==="leave_request"){

const modal=new ModalBuilder()
.setCustomId("leave_modal")
.setTitle("ยื่นคำขอลา");

const start=new TextInputBuilder()
.setCustomId("start")
.setLabel("วันที่เริ่ม (YYYY-MM-DD)")
.setStyle(TextInputStyle.Short);

const end=new TextInputBuilder()
.setCustomId("end")
.setLabel("วันที่สิ้นสุด (YYYY-MM-DD)")
.setStyle(TextInputStyle.Short);

const reason=new TextInputBuilder()
.setCustomId("reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(start),
new ActionRowBuilder().addComponents(end),
new ActionRowBuilder().addComponents(reason)
);

return interaction.showModal(modal);

}

/* ===== APPROVE ===== */

if(interaction.customId.startsWith("approve_")){

if(!interaction.member.roles.cache.has(APPROVER_ROLE_ID)){

return interaction.reply({
content:"❌ คุณไม่มีสิทธิ์",
ephemeral:true
});

}

const embed=interaction.message.embeds[0];

const userId=interaction.customId.split("_")[1];

const newEmbed=EmbedBuilder.from(embed)
.setColor(0x57F287)
.setDescription(embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`✅ อนุมัติแล้ว
👮 ผู้อนุมัติ: ${interaction.user}`
));

await interaction.update({
embeds:[newEmbed],
components:[]
});

}

/* ===== REJECT ===== */

if(interaction.customId.startsWith("reject_")){

const modal=new ModalBuilder()
.setCustomId(`reject_modal_${interaction.customId.split("_")[1]}`)
.setTitle("เหตุผลการปฏิเสธ");

const reason=new TextInputBuilder()
.setCustomId("reject_reason")
.setLabel("เหตุผล")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(reason)
);

return interaction.showModal(modal);

}

}

/* ===== MODAL ===== */

if(interaction.isModalSubmit()){

if(interaction.customId==="leave_modal"){

const start=interaction.fields.getTextInputValue("start");
const end=interaction.fields.getTextInputValue("end");
const reason=interaction.fields.getTextInputValue("reason");

const days=calculateLeaveDays(start,end);

if(!days){

return interaction.reply({
content:"❌ วันที่ไม่ถูกต้อง",
ephemeral:true
});

}

await saveLeave(
interaction.user.id,
start,
end,
days,
reason,
"รออนุมัติ"
);

const embed=new EmbedBuilder()
.setTitle("📄 คำขอลา")
.setDescription(
`👤 ผู้ยื่น: ${interaction.user}

📅 วันที่เริ่ม: ${start}
📅 วันที่สิ้นสุด: ${end}
📆 จำนวนวันลา: ${days} วัน

📝 เหตุผล
${reason}

⏳ สถานะ: รออนุมัติ`
)
.setColor(0x2b2d31);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`approve_${interaction.user.id}`)
.setLabel("อนุมัติ")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId(`reject_${interaction.user.id}`)
.setLabel("ปฏิเสธ")
.setStyle(ButtonStyle.Danger)

);

const channel=await client.channels.fetch(TARGET_CHANNEL_ID);

await channel.send({
content:`<@&${process.env.NOTIFY_ROLE_ID}>`,
embeds:[embed],
components:[row]
});

return interaction.reply({
content:"✅ ส่งคำขอลาเรียบร้อย",
ephemeral:true
});

}

if(interaction.customId.startsWith("reject_modal_")){

const reason=interaction.fields.getTextInputValue("reject_reason");

const embed=interaction.message.embeds[0];

const newEmbed=EmbedBuilder.from(embed)
.setColor(0xED4245)
.setDescription(embed.description.replace(
"⏳ สถานะ: รออนุมัติ",
`❌ ปฏิเสธ
เหตุผล: ${reason}
👮 ผู้ดำเนินการ: ${interaction.user}`
));

await interaction.update({
embeds:[newEmbed],
components:[]
});

}

}

}catch(err){

console.error(err);

if(!interaction.replied){

interaction.reply({
content:"❌ เกิดข้อผิดพลาด",
ephemeral:true
});

}

}

});

client.login(TOKEN);
