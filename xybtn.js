const settings = require("./settings.json");

async function makeListMessage(caption, title, buttonText, sections, recommendedRowId) {
  const listMessage = {
    text: caption,
    footer: `${settings.botName} by ${settings.author}`,
    title,
    buttonText,
    sections,
    listType: 2,
    recommendedRowId,
  };

  console.log("[Debug] List message created without thumbnail");
  return listMessage;
}

module.exports = { makeListMessage };