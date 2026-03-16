```javascript
require("dotenv").config();

const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

console.log("🚀 BOT STARTING...");

// ตรวจสอบ TOKEN
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.log("❌ TOKEN NOT FOUND IN ENV");
  process.exit(1);
}

console.log("ENV CHECK: TOKEN FOUND");

// สร้าง Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// เมื่อบอทออนไลน์
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// จัดการ error
client.on("error", (err) => {
  console.error("❌ Discord Error:", err);
});

// Login บอท
client.login(TOKEN)
  .then(() => {
    console.log("🤖 Discord Login Success");
  })
  .catch((err) => {
    console.error("❌ Discord Login Error:", err);
  });

// Web server สำหรับ Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Discord Bot is running.");
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
```
