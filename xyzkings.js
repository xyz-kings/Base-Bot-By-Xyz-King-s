const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require("@whiskeysockets/baileys");
const { question } = require("./lib/question");
const pino = require("pino");

async function mulaiBot(usePairingCode = true) {
  const { state, saveCreds } = await useMultiFileAuthState("ZVexDev_Sesion");
  const { version } = await fetchLatestBaileysVersion();

  const bot = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: !usePairingCode,
    connectTimeoutMs: 10000,
    keepAliveIntervalMs: 30000,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    logger: pino({ level: "error" }),
  });

  if (usePairingCode && !bot.user && !bot.authState.creds.registered) {
    const response = (await question("Pake kode pairing? [Y/n]: ")).toLowerCase();
    usePairingCode = response !== "n";
    if (!usePairingCode) return mulaiBot(false);

    const waNumber = await question("Masukkan nomor WhatsApp (contoh: +6281234567890): ");
    const cleanedNumber = waNumber.replace(/\D/g, "");
    if (!cleanedNumber || !/^\d{10,15}$/.test(cleanedNumber)) {
      console.log("Nomor nggak valid bro! Pakai format internasional, kayak +6281234567890.");
      return mulaiBot(true);
    }

    const code = await bot.requestPairingCode(cleanedNumber);
    console.log(`KODE PAIRING: ${code}`);
    console.log("Buka WhatsApp > Pengaturan > Perangkat Tertaut > Tautkan dengan Nomor Telepon");
  }

  bot.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
        await require("fs/promises").rm("ZVexDev_Sesion", { recursive: true, force: true });
        return mulaiBot(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return mulaiBot(usePairingCode);
    }
    if (connection === "open") {
      await require("./xyzhome").loadPlugins();
      await require("./xyzhome").notifyOwner(bot);
    }
  });

  bot.ev.on("creds.update", saveCreds);

  const { messageHandler } = require("./xyzhome");

  bot.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      await messageHandler(bot, { messages: [message] });
    }
  });
}

mulaiBot().catch((error) => {
  console.log("Error mulai bot:", error.message);
  process.exit(1);
});