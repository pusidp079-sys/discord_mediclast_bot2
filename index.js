```javascript
require("dotenv").config();

const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

console.log("BOT STARTING");

// TOKEN
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.log("TOKEN NOT FOUND");
  process.exit(1);
}

console.log("TOKEN FOUND");

// Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Ready
client.once("ready", () => {
  console.log("Logged in as " + client.user.tag);
});

// Error
client.on("error", (err) => {
  console.error("Discord Error:", err);
});

// Login
client.login(TOKEN).catch(console.error);

// Express Server (สำหรับ Render)
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Discord bot is running");
});

app.listen(PORT, () => {
  console.log("Web server running on port " + PORT);
});
```
