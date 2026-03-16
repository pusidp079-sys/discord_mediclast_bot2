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

// Bot Ready
client.once("ready", function () {
  console.log("Logged in as " + client.user.tag);
});

// Error handler
client.on("error", function (err) {
  console.error("Discord Error:", err);
});

// Login
client.login(TOKEN);

// Web server สำหรับ Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", function (req, res) {
  res.send("Discord Bot Running");
});

app.listen(PORT, function () {
  console.log("Web server running on port " + PORT);
});
```
