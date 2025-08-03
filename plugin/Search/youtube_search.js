// plugin/Download/youtube_search.js
const yts = require("yt-search");

module.exports = {
  name: "YouTube Search",
  description: "Search for YouTube videos",
  command: "ytsearch",
  execute: async (client, msg, args) => {
    const from = msg.key.remoteJid;
    if (!args) {
      await client.sendMessage(from, { text: "Masukkan kueri pencarian! Contoh: .ytsearch tutorial node.js" });
      return;
    }

    const query = args;
    try {
      const results = await yts(query);
      const videos = results.videos.slice(0, 5); // Ambil 5 video teratas
      if (videos.length === 0) {
        await client.sendMessage(from, { text: "Tidak ada video ditemukan!" });
        return;
      }

      let response = "*Hasil Pencarian YouTube*\n\n";
      videos.forEach((video, index) => {
        response += `${index + 1}. *${video.title}*\n`;
        response += `   - URL: ${video.url}\n`;
        response += `   - Durasi: ${video.duration.toString()}\n`;
        response += `   - Channel: ${video.author.name}\n\n`;
      });

      await client.sendMessage(from, { text: response });
      console.log("[Debug] YouTube search results sent to:", from);
    } catch (error) {
      console.log("[Error] YouTube search plugin:", error.message);
      await client.sendMessage(from, { text: "Gagal mencari video, coba lagi!" });
    }
  },
};