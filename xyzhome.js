const fs = require("fs").promises;
const path = require("path");
const moment = require("moment-timezone");
const ms = require("parse-ms");
const { performance } = require("perf_hooks");
const settings = require("./settings.json");
const { makeListMessage } = require("./xybtn");

// State bot
let botStartTime = performance.now();
let isPublicMode = true;
let isAutoRead = false; // State untuk auto-read
let plugins = {};

// Fungsi untuk mendapatkan waktu sapaan
function getGreeting() {
  const hour = moment().tz("Asia/Jakarta").hour();
  if (hour >= 0 && hour < 5) return "Subuh";
  if (hour >= 5 && hour < 12) return "Pagi";
  if (hour >= 12 && hour < 15) return "Siang";
  if (hour >= 15 && hour < 18) return "Sore";
  return "Malam";
}

// Fungsi untuk menghitung runtime
function getRuntime() {
  const uptime = performance.now() - botStartTime;
  const { days, hours, minutes, seconds } = ms(uptime);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Fungsi untuk membuat caption
function getMenuCaption(msg, isAllMenu = false, category = null, responseTime = 0) {
  const userName = msg.pushName || "User";
  const userNumber = msg.key.remoteJid.split("@")[0];
  const mode = isPublicMode ? "Public" : "Self";
  const greeting = getGreeting();
  const isOwner = msg.key.fromMe || userNumber === settings.ownerNumber;

  let caption = `
Halo Kak *${userName}* Selamat ${greeting}

◤─「 *INFO USER* 」──✦
 ⎆ [ Nama : ${userName}
 ⎆ [ Nomor : ${userNumber}
 ⎆ [ Mode : ${mode}
 ⎆ [ Auto-Read : ${isAutoRead ? "On" : "Off"}
 ⎆ [ Author : ${settings.author}
◣──────────❈

◤─「 *INFO BOT* 」──✦
 ⎆ Runtime : ${getRuntime()}
 ⎆ Versi : ${settings.version}
 ⎆ Respon : ${responseTime.toFixed(2)} ms
◣─────────────✦

*Kalau ada fitur bug atau error kontak owner ya*

ʙᴏᴛ ɪɴɪ ᴅᴀᴘᴀᴛ ᴅɪɢᴜɴᴀᴋᴀɴ ᴜɴᴛᴜᴋ ʙᴇʀʙᴀɢᴀɪ ᴍᴀᴄᴀᴍ, ʙᴏᴛ ɪɴɪ ᴄᴏᴄᴏᴋ ᴜɴᴛᴜᴋ ᴊᴀɢᴀ ɢʀᴜᴘ. ᴋᴀᴍᴜ ʙɪsᴀ ɢᴜɴᴀᴋᴀɴ ʙᴏᴛ ɪɴɪ ᴜɴᴛᴜᴋ ᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ, ᴇᴅᴜᴋᴀsɪ, ʙᴇʟᴀᴊᴀʀ ᴅᴀɴ ʟᴀɪɴɴʯᴀ, ʏᴀɴɢ ᴅᴀᴘᴀᴛ ᴍᴇᴍʙᴜᴀᴛ ʟᴇʙɪʜ ᴍᴜᴅᴀʜ ᴜɴᴛᴜᴋ ᴍᴇɴᴊᴀʟᴀɴᴋᴀɴ sᴇʜᴀʀɪ ʜᴀʀɪ
`;

  if (isAllMenu) {
    caption += "\n";
    for (const cat in plugins) {
      caption += `\n◤─「 *${cat}* 」─✦\n`;
      plugins[cat].forEach((plugin) => {
        caption += `│⟡ 〔 _.${plugin.command}_\n`;
      });
      caption += `◣──────────❈\n`;
    }
    if (isOwner) {
      caption += `\n◤─「 *Owner-Only* 」─✦\n`;
      caption += `│⟡ 〔 _.self_\n`;
      caption += `│⟡ 〔 _.public_\n`;
      caption += `│⟡ 〔 _.auto_read_\n`;
      caption += `│⟡ 〔 _.setmode_\n`;
      caption += `│⟡ 〔 _.reload_\n`;
      caption += `◣──────────❈\n`;
    }
    caption += "\n©Xyz-King's";
  } else if (category) {
    caption = `
*${category.toUpperCase()}*

◤─「 *INFO USER* 」──✦
 ⎆ [ Nama : ${userName}
 ⎆ [ Nomor : ${userNumber}
 ⎆ [ Mode : ${mode}
 ⎆ [ Auto-Read : ${isAutoRead ? "On" : "Off"}
 ⎆ [ Author : ${settings.author}
◣──────────❈

◤─「 *INFO BOT*  »──✦
 ⎆ Runtime : ${getRuntime()}
 ⎆ Versi : ${settings.version}
 ⎆ Respon : ${responseTime.toFixed(2)} ms
◣─────────────✦

*Kalau ada fitur bug atau error kontak owner ya*

◤─「 *${category}* 」─✦\n`;
    plugins[category].forEach((plugin) => {
      caption += `│⟡ 〔 _.${plugin.command}_\n`;
    });
    caption += `◣──────────❈\n©Xyz-King's`;
  }

  return caption;
}

// Fungsi untuk memuat plugin
async function loadPlugins() {
  plugins = {};
  const pluginDir = path.join(__dirname, "plugin");
  try {
    const folders = await fs.readdir(pluginDir, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const pluginFiles = await fs.readdir(path.join(pluginDir, folder.name));
        plugins[folder.name] = [];
        for (const file of pluginFiles) {
          if (file.endsWith(".js")) {
            const pluginPath = path.join(pluginDir, folder.name, file);
            try {
              delete require.cache[require.resolve(pluginPath)];
              const pluginModule = require(pluginPath);
              if (pluginModule.command && pluginModule.execute) {
                plugins[folder.name].push({
                  name: pluginModule.name || file.replace(".js", ""),
                  description: pluginModule.description || "No description",
                  command: pluginModule.command,
                  execute: pluginModule.execute,
                });
                console.log(`[Debug] Loaded plugin: ${folder.name}/${file}`);
              } else {
                console.log(`[Warn] Plugin ${file} in ${folder.name} lacks command or execute function`);
              }
            } catch (error) {
              console.log(`[Error] Loading plugin ${file} in ${folder.name}:`, error.message);
            }
          }
        }
      }
    }
    console.log("[Info] Plugins loaded:", Object.keys(plugins));
  } catch (error) {
    console.log("[Error] Loading plugins directory:", error.message);
  }
}

// Handler utama pesan
async function messageHandler(client, message) {
  if (!message.messages || !Array.isArray(message.messages) || message.messages.length === 0) {
    console.log("[Error] Invalid message structure");
    return;
  }

  const msg = message.messages[0];
  if (!msg.key || !msg.message) {
    console.log("[Debug] Message ignored (no key or message)");
    return;
  }

  const from = msg.key.remoteJid;
  const isGroup = from.endsWith("@g.us");
  const sender = isGroup ? msg.key.participant : from;

  // Auto-read pesan jika aktif
  if (isAutoRead && !msg.key.fromMe) {
    await client.readMessages([msg.key]);
    console.log("[Debug] Auto-read message from:", sender);
  }

  // Abaikan pesan List Message dari bot sendiri
  if (msg.key.fromMe && msg.message.listMessage) {
    console.log("[Debug] Ignoring own list message from:", from);
    return;
  }

  console.log("[Debug] Sender:", sender, "FromMe:", msg.key.fromMe);

  let text = "";
  if (msg.message.conversation) {
    text = msg.message.conversation;
  } else if (msg.message.extendedTextMessage?.text) {
    text = msg.message.extendedTextMessage.text;
  } else if (msg.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
    const startTime = performance.now();
    const rowId = msg.message.listResponseMessage.singleSelectReply.selectedRowId;
    console.log("[Debug] List response received, rowId:", rowId);
    if (rowId.startsWith("category_")) {
      const category = rowId.replace("category_", "");
      try {
        await client.sendMessage(from, { text: category.toUpperCase() });
        console.log("[Debug] Sent category name:", category.toUpperCase());
        const responseTime = performance.now() - startTime;
        const caption = getMenuCaption(msg, false, category, responseTime);
        await client.sendMessage(from, { text: caption });
        console.log("[Debug] Subfolder menu sent to:", from, "Category:", category, "Response time:", responseTime.toFixed(2), "ms");
      } catch (error) {
        console.log("[Error] Sending subfolder menu:", error.message);
        await client.sendMessage(from, { text: settings.messages.error });
      }
    } else if (rowId === "allmenu") {
      try {
        await client.sendMessage(from, { text: "ALL MENU" });
        console.log("[Debug] Sent ALL MENU");
        const responseTime = performance.now() - startTime;
        const caption = getMenuCaption(msg, true, null, responseTime);
        await client.sendMessage(from, { text: caption });
        console.log("[Debug] All menu sent to:", from, "Response time:", responseTime.toFixed(2), "ms");
      } catch (error) {
        console.log("[Error] Sending all menu:", error.message);
        await client.sendMessage(from, { text: settings.messages.error });
      }
    }
    return;
  } else {
    console.log("[Debug] Unsupported message type:", Object.keys(msg.message));
    return;
  }

  console.log("[Debug] Text received:", text, "From:", sender);

  const command = text.split(" ")[0].toLowerCase();
  const args = text.slice(command.length).trim();

  if (!command.startsWith(settings.prefix)) {
    console.log("[Debug] No prefix, ignoring:", command);
    return;
  }
  const cmd = command.slice(settings.prefix.length);

  console.log("[Debug] Command:", cmd, "Args:", args);

  const startTime = performance.now();

  if (!isPublicMode && sender !== `${settings.ownerNumber}@s.whatsapp.net` && !["menu", "allmenu", "self", "public", "auto_read"].includes(cmd) && !cmd.startsWith("menu_")) {
    console.log("[Debug] Command ignored (self mode, non-owner):", sender);
    await client.sendMessage(from, { text: settings.messages.ownerOnly });
    return;
  }

  if (cmd === "menu") {
    try {
      const caption = getMenuCaption(msg, false, null, 0);
      const sections = [
        {
          title: "Kategori Fitur",
          rows: [
            {
              title: "🟢 All Menu (Recommended)",
              description: "",
              rowId: "allmenu",
            },
            ...Object.keys(plugins).map((category) => ({
              title: category.toUpperCase(),
              description: "",
              rowId: `category_${category}`,
            })),
          ],
        },
      ];

      const listMessage = await makeListMessage(caption, "📋 Menu Bot", "Pilih Kategori", sections, "allmenu");
      await client.sendMessage(from, listMessage);
      const responseTime = performance.now() - startTime;
      console.log("[Debug] Menu sent to:", from, "Response time:", responseTime.toFixed(2), "ms");
    } catch (error) {
      console.log("[Error] Sending menu:", error.message);
      await client.sendMessage(from, { text: settings.messages.error });
    }
    return;
  }

  if (cmd === "allmenu") {
    try {
      await client.sendMessage(from, { text: "ALL MENU" });
      console.log("[Debug] Sent ALL MENU");
      const responseTime = performance.now() - startTime;
      const caption = getMenuCaption(msg, true, null, responseTime);
      await client.sendMessage(from, { text: caption });
      console.log("[Debug] All menu sent to:", from, "Response time:", responseTime.toFixed(2), "ms");
    } catch (error) {
      console.log("[Error] Sending all menu:", error.message);
      await client.sendMessage(from, { text: settings.messages.error });
    }
    return;
  }

  if (cmd.startsWith("menu_")) {
    const category = cmd.replace("menu_", "");
    if (!plugins[category]) {
      console.log("[Error] Category not found:", category);
      await client.sendMessage(from, { text: settings.messages.error });
      return;
    }

    try {
      await client.sendMessage(from, { text: category.toUpperCase() });
      console.log("[Debug] Sent category name:", category.toUpperCase());
      const responseTime = performance.now() - startTime;
      const caption = getMenuCaption(msg, false, category, responseTime);
      await client.sendMessage(from, { text: caption });
      console.log("[Debug] Subfolder menu sent to:", from, "Category:", category, "Response time:", responseTime.toFixed(2), "ms");
    } catch (error) {
      console.log("[Error] Sending subfolder menu:", error.message);
      await client.sendMessage(from, { text: settings.messages.error });
    }
    return;
  }

  if (cmd === "self") {
    if (sender !== `${settings.ownerNumber}@s.whatsapp.net`) {
      await client.sendMessage(from, { text: settings.messages.ownerOnly });
      return;
    }
    isPublicMode = false;
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Mode bot diubah ke *Self*. Hanya owner bisa gunakan perintah! (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Mode set to Self", "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  if (cmd === "public") {
    if (sender !== `${settings.ownerNumber}@s.whatsapp.net`) {
      await client.sendMessage(from, { text: settings.messages.ownerOnly });
      return;
    }
    isPublicMode = true;
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Mode bot diubah ke *Public*. Semua orang bisa gunakan perintah! (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Mode set to Public", "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  if (cmd === "auto_read") {
    if (sender !== `${settings.ownerNumber}@s.whatsapp.net`) {
      await client.sendMessage(from, { text: settings.messages.ownerOnly });
      return;
    }
    isAutoRead = !isAutoRead;
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Auto-read diubah ke *${isAutoRead ? "On" : "Off"}* (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Auto-read set to:", isAutoRead, "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  if (cmd === "setmode") {
    if (sender !== `${settings.ownerNumber}@s.whatsapp.net`) {
      await client.sendMessage(from, { text: settings.messages.ownerOnly });
      return;
    }
    isPublicMode = args === "public";
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Mode set to ${isPublicMode ? "Public" : "Self"} (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Mode set to:", isPublicMode ? "Public" : "Self", "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  if (cmd === "ping") {
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Pong! (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Ping sent to:", from, "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  if (cmd === "reload") {
    if (sender !== `${settings.ownerNumber}@s.whatsapp.net`) {
      await client.sendMessage(from, { text: settings.messages.ownerOnly });
      return;
    }
    await loadPlugins();
    const responseTime = performance.now() - startTime;
    await client.sendMessage(from, { text: `Plugins reloaded! (${responseTime.toFixed(2)} ms)` });
    console.log("[Debug] Plugins reloaded manually", "Response time:", responseTime.toFixed(2), "ms");
    return;
  }

  for (const category in plugins) {
    for (const plugin of plugins[category]) {
      if (plugin.command === cmd) {
        try {
          console.log("[Debug] Executing plugin:", plugin.name);
          await plugin.execute(client, msg, args);
          const responseTime = performance.now() - startTime;
          console.log("[Debug] Plugin executed successfully:", plugin.name, "Response time:", responseTime.toFixed(2), "ms");
        } catch (error) {
          console.log(`[Error] Plugin ${plugin.name}:`, error.message);
          await client.sendMessage(from, { text: settings.messages.error });
        }
        return;
      }
    }
  }

  console.log("[Debug] No matching command found:", cmd);
}

// Notifikasi ke owner
async function notifyOwner(client) {
  const botNumber = client.user?.id.split(":")[0] || "Unknown";
  await client.sendMessage(`${settings.ownerNumber}@s.whatsapp.net`, {
    text: `Bot is online on number ${botNumber}!`,
  });
}

module.exports = { loadPlugins, messageHandler, notifyOwner };